// GitHub API integration service
// @ts-ignore
import { db } from '@/shared/api/firebase/firebase';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Type assertion for db to avoid implicit any
// @ts-ignore
const firestoreDb: Firestore = db as any;

interface GitHubIssue {
    id: number;
    number: number;
    title: string;
    body?: string;
    state: string;
    html_url: string;
    created_at: string;
    updated_at: string;
    assignee?: any;
    labels: any[];
    user: any;
}

interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    description?: string;
    html_url: string;
    owner: any;
    private: boolean;
}

// Cache configuration and storage
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

const cache = new Map<string, CacheEntry<any>>();

// Default TTL values (in milliseconds)
const CACHE_TTL = {
    USER_PROFILE: 5 * 60 * 1000,      // 5 minutes
    USER_REPOS: 2 * 60 * 1000,        // 2 minutes
    ORG_REPOS: 2 * 60 * 1000,         // 2 minutes
    ORGANIZATIONS: 5 * 60 * 1000,     // 5 minutes
    REPO_ISSUES: 30 * 1000,           // 30 seconds (issues change frequently)
    PROJECTS: 60 * 1000,              // 1 minute
    ISSUE_DETAILS: 30 * 1000,         // 30 seconds
    DEFAULT: 60 * 1000,               // 1 minute default
};

// Cache utility functions
const getCacheKey = (endpoint: string, userId: string): string => `${userId}:${endpoint}`;

const getFromCache = <T>(key: string): T | null => {
    const entry = cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
        cache.delete(key);
        return null;
    }
    
    return entry.data as T;
};

const setInCache = <T>(key: string, data: T, ttl: number = CACHE_TTL.DEFAULT): void => {
    cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
    });
};

// Invalidate cache entries matching a pattern
const invalidateCache = (pattern?: string): void => {
    if (!pattern) {
        cache.clear();
        return;
    }
    
    const keysToDelete: string[] = [];
    cache.forEach((_, key) => {
        if (key.includes(pattern)) {
            keysToDelete.push(key);
        }
    });
    keysToDelete.forEach(key => cache.delete(key));
};

// Export cache utilities for external use
export const githubCache = {
    invalidate: invalidateCache,
    clear: () => cache.clear(),
    size: () => cache.size,
};

// Rate limit state management
interface RateLimitState {
    isLimited: boolean;
    resetTime: Date | null;
    remaining: number;
    limit: number;
}

// Global rate limit state
let rateLimitState: RateLimitState = {
    isLimited: false,
    resetTime: null,
    remaining: 5000,
    limit: 5000,
};

// Listeners for rate limit changes
const rateLimitListeners: Set<(state: RateLimitState) => void> = new Set();

// Export rate limit utilities
export const getRateLimitState = (): RateLimitState => ({ ...rateLimitState });

export const subscribeToRateLimit = (listener: (state: RateLimitState) => void): (() => void) => {
    rateLimitListeners.add(listener);
    return () => { rateLimitListeners.delete(listener); };
};

export const resetRateLimit = () => {
    rateLimitState = {
        isLimited: false,
        resetTime: null,
        remaining: 5000,
        limit: 5000,
    };
    notifyRateLimitListeners();
};

const notifyRateLimitListeners = () => {
    rateLimitListeners.forEach(listener => listener({ ...rateLimitState }));
};

const updateRateLimitFromResponse = (response: Response) => {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const limit = response.headers.get('x-ratelimit-limit');
    const reset = response.headers.get('x-ratelimit-reset');

    if (remaining !== null) {
        rateLimitState.remaining = parseInt(remaining, 10);
    }
    if (limit !== null) {
        rateLimitState.limit = parseInt(limit, 10);
    }
    if (reset !== null) {
        rateLimitState.resetTime = new Date(parseInt(reset, 10) * 1000);
    }

    // Check if we're rate limited (only when remaining is 0 OR explicit 403 with rate limit message)
    if (rateLimitState.remaining <= 0) {
        rateLimitState.isLimited = true;
    } else if (response.status !== 403) {
        // Reset isLimited if we have remaining requests and no 403
        rateLimitState.isLimited = false;
    }

    notifyRateLimitListeners();
};

const setRateLimited = (resetTimeSeconds?: number) => {
    rateLimitState.isLimited = true;
    rateLimitState.remaining = 0;
    if (resetTimeSeconds) {
        rateLimitState.resetTime = new Date(resetTimeSeconds * 1000);
    } else {
        // Default: 1 hour from now
        rateLimitState.resetTime = new Date(Date.now() + 60 * 60 * 1000);
    }
    notifyRateLimitListeners();
};

class GitHubService {
    private baseURL: string;
    private graphqlURL: string;

    constructor() {
        this.baseURL = 'https://api.github.com';
        this.graphqlURL = 'https://api.github.com/graphql';
    }

    /**
     * Get user's GitHub access token from Firestore
     */
    async getUserToken(userId: string): Promise<string | null> {
        try {
            const userDoc = await getDoc(doc(firestoreDb, 'users', userId));
            if (userDoc.exists()) {
                return userDoc.data().githubToken || null;
            }
            return null;
        } catch (error) {
            console.error('Erro ao buscar token do usuário:', error);
            return null;
        }
    }

    /**
     * Save GitHub token to Firestore
     */
    async saveUserToken(userId: string, token: string, username: string): Promise<void> {
        try {
            await updateDoc(doc(firestoreDb, 'users', userId), {
                githubToken: token,
                githubUsername: username,
                githubConnectedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Erro ao salvar token do GitHub:', error);
            throw error;
        }
    }

    /**
     * Make authenticated request to GitHub API (with optional caching)
     */
    private async makeRequest(
        endpoint: string,
        userId: string,
        options: RequestInit = {},
        cacheTtl?: number
    ): Promise<any> {
        // Check cache for GET requests
        const isGetRequest = !options.method || options.method === 'GET';
        const cacheKey = getCacheKey(endpoint, userId);
        
        if (isGetRequest && cacheTtl !== undefined) {
            const cached = getFromCache(cacheKey);
            if (cached) {
                return cached;
            }
        }

        const token = await this.getUserToken(userId);
        if (!token) {
            throw new Error('GitHub não está conectado. Por favor, faça login com GitHub.');
        }

        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                ...options.headers,
            },
        });

        // Update rate limit state from response headers (for monitoring only)
        updateRateLimitFromResponse(response);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || `GitHub API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Cache successful GET responses
        if (isGetRequest && cacheTtl !== undefined) {
            setInCache(cacheKey, data, cacheTtl);
        }
        
        return data;
    }

    /**
     * Make GraphQL request to GitHub API (with optional caching)
     */
    private async makeGraphQLRequest(
        query: string,
        variables: any,
        userId: string,
        cacheKey?: string,
        cacheTtl?: number
    ): Promise<any> {
        // Check cache if cacheKey is provided
        if (cacheKey) {
            const fullCacheKey = getCacheKey(cacheKey, userId);
            const cached = getFromCache(fullCacheKey);
            if (cached) {
                return cached;
            }
        }

        const token = await this.getUserToken(userId);
        if (!token) {
            throw new Error('GitHub não está conectado.');
        }

        const response = await fetch(this.graphqlURL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, variables }),
        });

        // Update rate limit state from response headers (for monitoring only)
        updateRateLimitFromResponse(response);

        if (!response.ok) {
            throw new Error(`GitHub GraphQL error: ${response.status}`);
        }

        const result = await response.json();
        if (result.errors) {
            throw new Error(result.errors[0].message);
        }

        const data = result.data;
        
        // Cache successful responses if cacheKey provided
        if (cacheKey && cacheTtl) {
            const fullCacheKey = getCacheKey(cacheKey, userId);
            setInCache(fullCacheKey, data, cacheTtl);
        }

        return data;
    }

    /**
     * Get authenticated user's profile
     */
    async getUserProfile(userId: string): Promise<any> {
        return this.makeRequest('/user', userId, {}, CACHE_TTL.USER_PROFILE);
    }

    /**
     * Get user's organizations
     */
    async getUserOrganizations(userId: string): Promise<any[]> {
        try {
            const orgs = await this.makeRequest('/user/orgs', userId, {}, CACHE_TTL.ORGANIZATIONS);
            return orgs;
        } catch (error) {
            console.error('Erro ao buscar organizações:', error);
            return [];
        }
    }

    /**
     * Get user's repositories
     */
    async getUserRepos(userId: string, type: 'all' | 'owner' | 'member' = 'all'): Promise<GitHubRepo[]> {
        return this.makeRequest(`/user/repos?type=${type}&sort=updated&per_page=100`, userId, {}, CACHE_TTL.USER_REPOS);
    }

    /**
     * Get organization's repositories
     */
    async getOrgRepos(orgLogin: string, userId: string): Promise<GitHubRepo[]> {
        try {
            const repos = await this.makeRequest(
                `/orgs/${orgLogin}/repos?type=all&sort=updated&per_page=100`,
                userId,
                {},
                CACHE_TTL.ORG_REPOS
            );
            return repos;
        } catch (error) {
            console.error(`Erro ao buscar repos da org ${orgLogin}:`, error);
            return [];
        }
    }

    /**
     * Get organization members
     */
    async getOrgMembers(orgLogin: string, userId: string): Promise<any[]> {
        try {
            // Fetch all members first
            const members = await this.makeRequest(
                `/orgs/${orgLogin}/members?per_page=100`,
                userId,
                {},
                CACHE_TTL.DEFAULT
            );

            // Fetch admin members to identify owners
            let adminLogins: Set<string>;
            try {
                const admins = await this.makeRequest(
                    `/orgs/${orgLogin}/members?role=admin&per_page=100`,
                    userId,
                    {},
                    CACHE_TTL.DEFAULT
                );
                adminLogins = new Set(admins.map((a: any) => a.login));
            } catch {
                adminLogins = new Set();
            }

            // Tag each member with their org role
            return members.map((m: any) => ({
                ...m,
                org_role: adminLogins.has(m.login) ? 'admin' : 'member'
            }));
        } catch (error) {
            console.error(`Erro ao buscar membros da org ${orgLogin}:`, error);
            return [];
        }
    }

    /**
     * Get contributors for a repository
     */
    async getRepoContributors(owner: string, repo: string, userId: string): Promise<any[]> {
        try {
            return await this.makeRequest(
                `/repos/${owner}/${repo}/contributors?per_page=100`,
                userId,
                {},
                CACHE_TTL.DEFAULT
            );
        } catch (error) {
            console.error(`Erro ao buscar contribuidores de ${owner}/${repo}:`, error);
            return [];
        }
    }

    /**
     * Get aggregated contributors across all personal repos
     */
    async getPersonalRepoContributors(userId: string): Promise<any[]> {
        try {
            const repos = await this.makeRequest(
                `/user/repos?type=owner&sort=updated&per_page=30`,
                userId,
                {},
                CACHE_TTL.USER_REPOS
            );

            const contributorPromises = repos.slice(0, 10).map((repo: any) =>
                this.getRepoContributors(repo.owner.login, repo.name, userId)
            );

            const allContributors = (await Promise.all(contributorPromises)).flat();

            // Deduplicate by login, sum contributions
            const map = new Map<string, any>();
            for (const c of allContributors) {
                if (!c.login) continue;
                const existing = map.get(c.login);
                if (existing) {
                    existing.contributions += c.contributions || 0;
                    existing.repoCount = (existing.repoCount || 1) + 1;
                } else {
                    map.set(c.login, { ...c, repoCount: 1 });
                }
            }

            return Array.from(map.values()).sort((a, b) => b.contributions - a.contributions);
        } catch (error) {
            console.error('Erro ao buscar contribuidores pessoais:', error);
            return [];
        }
    }

    /**
     * Get all repositories (personal + organizations)
     */
    async getAllUserRepos(userId: string): Promise<GitHubRepo[]> {
        try {
            // Get personal repos
            const personalRepos = await this.makeRequest(
                `/user/repos?type=owner&sort=updated&per_page=100`,
                userId,
                {},
                CACHE_TTL.USER_REPOS
            );

            // Get organizations
            const orgs = await this.getUserOrganizations(userId);

            // Get repos from each organization
            const orgReposPromises = orgs.map(org =>
                this.makeRequest(
                    `/orgs/${org.login}/repos?type=all&sort=updated&per_page=100`,
                    userId,
                    {},
                    CACHE_TTL.ORG_REPOS
                ).catch(err => {
                    console.warn(`Erro ao buscar repos da org ${org.login}:`, err);
                    return [];
                })
            );

            const orgReposArrays = await Promise.all(orgReposPromises);
            const orgRepos = orgReposArrays.flat();

            // Combine and deduplicate
            const allRepos = [...personalRepos, ...orgRepos];
            const uniqueRepos = Array.from(
                new Map(allRepos.map(repo => [repo.id, repo])).values()
            );

            return uniqueRepos;
        } catch (error) {
            console.error('Erro ao buscar todos os repositórios:', error);
            throw error;
        }
    }

    /**
     * Get a single issue by number
     */
    async getIssue(
        owner: string,
        repo: string,
        issueNumber: number,
        userId: string
    ): Promise<GitHubIssue | null> {
        try {
            return await this.makeRequest(
                `/repos/${owner}/${repo}/issues/${issueNumber}`,
                userId,
                {},
                CACHE_TTL.REPO_ISSUES
            );
        } catch (error) {
            console.warn(`[GitHub] Failed to get issue #${issueNumber}:`, error);
            return null;
        }
    }

    /**
     * Get repository issues
     */
    async getRepoIssues(
        owner: string,
        repo: string,
        userId: string,
        state: 'open' | 'closed' | 'all' = 'open'
    ): Promise<GitHubIssue[]> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/issues?state=${state}&per_page=100`,
            userId,
            {},
            CACHE_TTL.REPO_ISSUES
        );
    }

    /**
     * Create a new issue
     */
    async createIssue(
        owner: string,
        repo: string,
        issueData: {
            title: string;
            body?: string;
            assignees?: string[];
            labels?: string[];
        },
        userId: string
    ): Promise<GitHubIssue> {
        // Invalidate issues cache when creating
        invalidateCache(`/repos/${owner}/${repo}/issues`);
        return this.makeRequest(
            `/repos/${owner}/${repo}/issues`,
            userId,
            {
                method: 'POST',
                body: JSON.stringify(issueData),
            }
        );
    }

    /**
     * Update an existing issue
     */
    async updateIssue(
        owner: string,
        repo: string,
        issueNumber: number,
        updates: {
            title?: string;
            body?: string;
            state?: 'open' | 'closed';
            assignees?: string[];
            labels?: string[];
        },
        userId: string
    ): Promise<GitHubIssue> {
        // Invalidate issues cache when updating
        invalidateCache(`/repos/${owner}/${repo}/issues`);
        return this.makeRequest(
            `/repos/${owner}/${repo}/issues/${issueNumber}`,
            userId,
            {
                method: 'PATCH',
                body: JSON.stringify(updates),
            }
        );
    }

    /**
     * Close an issue
     */
    async closeIssue(
        owner: string,
        repo: string,
        issueNumber: number,
        userId: string
    ): Promise<GitHubIssue> {
        return this.updateIssue(owner, repo, issueNumber, { state: 'closed' }, userId);
    }

    /**
     * Get issue comments
     */
    async getIssueComments(
        owner: string,
        repo: string,
        issueNumber: number,
        userId: string
    ): Promise<any[]> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
            userId,
            {},
            CACHE_TTL.ISSUE_DETAILS
        );
    }

    /**
     * Add a comment to an issue
     */
    async addIssueComment(
        owner: string,
        repo: string,
        issueNumber: number,
        body: string,
        userId: string
    ): Promise<any> {
        // Invalidate comments cache when adding
        invalidateCache(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`);
        return this.makeRequest(
            `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
            userId,
            {
                method: 'POST',
                body: JSON.stringify({ body }),
            }
        );
    }

    /**
     * Get organization members
     */
    async getOrganizationMembers(org: string, userId: string): Promise<any[]> {
        return this.makeRequest(`/orgs/${org}/members`, userId, {}, CACHE_TTL.DEFAULT);
    }

    /**
     * Get repository projects (V2)
     */
    async getRepositoryProjectsV2(owner: string, repo: string, userId: string): Promise<any[]> {
        const query = `
            query($owner: String!, $repo: String!) {
                repository(owner: $owner, name: $repo) {
                    projectsV2(first: 20) {
                        nodes {
                            id
                            title
                            number
                            url
                            closed
                            public
                        }
                    }
                }
            }
        `;

        const cacheKey = `graphql:projectsV2:${owner}/${repo}`;
        const data = await this.makeGraphQLRequest(query, { owner, repo }, userId, cacheKey, CACHE_TTL.PROJECTS);
        return data?.repository?.projectsV2?.nodes || [];
    }

    /**
     * Get project details (V2)
     */
    async getProjectV2Details(projectId: string, userId: string): Promise<any> {
        const query = `
            query($projectId: ID!) {
                node(id: $projectId) {
                    ... on ProjectV2 {
                        id
                        title
                        number
                        url
                        fields(first: 20) {
                            nodes {
                                ... on ProjectV2Field {
                                    id
                                    name
                                }
                                ... on ProjectV2SingleSelectField {
                                    id
                                    name
                                    options {
                                        id
                                        name
                                    }
                                }
                            }
                        }
                        items(first: 100) {
                            nodes {
                                id
                                content {
                                    ... on Issue {
                                        id
                                        number
                                        title
                                        state
                                        url
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const cacheKey = `graphql:projectDetails:${projectId}`;
        const data = await this.makeGraphQLRequest(query, { projectId }, userId, cacheKey, CACHE_TTL.PROJECTS);
        return data?.node || null;
    }

    /**
     * Get repository's GitHub Projects V2
     */
    async getRepositoryProjects(owner: string, repo: string, userId: string): Promise<any[]> {
        const query = `
            query($owner: String!, $repo: String!) {
                repository(owner: $owner, name: $repo) {
                    projectsV2(first: 10) {
                        nodes {
                            id
                            title
                            number
                            url
                            items(first: 100) {
                                totalCount
                                nodes {
                                    id
                                    content {
                                        ... on Issue {
                                            id
                                            number
                                            title
                                            state
                                            createdAt
                                            updatedAt
                                        }
                                    }
                                    fieldValues(first: 20) {
                                        nodes {
                                            ... on ProjectV2ItemFieldSingleSelectValue {
                                                id
                                                name
                                                field {
                                                    ... on ProjectV2SingleSelectField {
                                                        id
                                                        name
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            fields(first: 20) {
                                nodes {
                                    ... on ProjectV2SingleSelectField {
                                        id
                                        name
                                        options {
                                            id
                                            name
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const cacheKey = `graphql:repoProjects:${owner}/${repo}`;
        const data = await this.makeGraphQLRequest(query, { owner, repo }, userId, cacheKey, CACHE_TTL.PROJECTS);
        return data?.repository?.projectsV2?.nodes || [];
    }

    /**
     * Update GitHub Projects V2 item status
     */
    async updateProjectV2ItemStatus(
        projectId: string,
        itemId: string,
        fieldId: string,
        optionId: string,
        userId: string
    ): Promise<any> {
        // Invalidate project caches when updating
        invalidateCache('graphql:project');
        
        const mutation = `
            mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
                updateProjectV2ItemFieldValue(
                    input: {
                        projectId: $projectId
                        itemId: $itemId
                        fieldId: $fieldId
                        value: $value
                    }
                ) {
                    projectV2Item {
                        id
                    }
                }
            }
        `;

        const variables = {
            projectId,
            itemId,
            fieldId,
            value: {
                singleSelectOptionId: optionId
            }
        };

        return this.makeGraphQLRequest(mutation, variables, userId);
    }

    /**
     * Get issue's project item ID
     */
    async getIssueProjectItem(owner: string, repo: string, issueNumber: number, userId: string): Promise<any> {
        const query = `
            query($owner: String!, $repo: String!, $issueNumber: Int!) {
                repository(owner: $owner, name: $repo) {
                    issue(number: $issueNumber) {
                        id
                        projectItems(first: 10) {
                            nodes {
                                id
                                project {
                                    id
                                    title
                                }
                            }
                        }
                    }
                }
            }
        `;

        try {
            const cacheKey = `graphql:issueProjectItem:${owner}/${repo}/${issueNumber}`;
            const data = await this.makeGraphQLRequest(query, { owner, repo, issueNumber }, userId, cacheKey, CACHE_TTL.ISSUE_DETAILS);
            return data?.repository?.issue?.projectItems?.nodes || [];
        } catch (error: any) {
            // Issue might not exist or was deleted
            if (error.message?.includes('Could not resolve to an Issue')) {
                console.warn(`⚠️ Issue #${issueNumber} não encontrada no repositório ${owner}/${repo}`);
                return [];
            }
            throw error;
        }
    }

    /**
     * Update issue status in GitHub Projects V2
     * Automatically finds the project and status field
     * If issue is not in any project, adds it to the first available project
     */
    async updateIssueProjectStatus(
        owner: string,
        repo: string,
        issueNumber: number,
        statusName: string,
        userId: string
    ): Promise<boolean> {
        // Invalidate relevant caches
        invalidateCache(`graphql:issueProjectItem:${owner}/${repo}/${issueNumber}`);
        
        try {
            // Ensure issue is in a project (adds if not)
            let projectItemId = await this.ensureIssueInProject(owner, repo, issueNumber, userId);

            if (!projectItemId) {
                return false;
            }

            // Get issue's project items (refresh after potential add)
            const projectItems = await this.getIssueProjectItem(owner, repo, issueNumber, userId);

            // Get repository projects to find status field
            const projects = await this.getRepositoryProjects(owner, repo, userId);

            for (const projectItem of projectItems) {
                const project = projects.find(p => p.id === projectItem.project.id);
                if (!project) continue;

                // Find Status field
                const statusField = project.fields.nodes.find(
                    (f: any) => f.name === 'Status'
                );

                if (!statusField) {
                    console.warn('Campo Status não encontrado no projeto');
                    continue;
                }

                // Find matching status option
                const statusOption = statusField.options.find(
                    (opt: any) => opt.name.toLowerCase() === statusName.toLowerCase()
                );

                if (!statusOption) {
                    console.log(`Status "${statusName}" não encontrado no projeto`);
                    continue;
                }

                // Update project item status
                await this.updateProjectV2ItemStatus(
                    project.id,
                    projectItem.id,
                    statusField.id,
                    statusOption.id,
                    userId
                );

                return true;
            }

            return false;
        } catch (error) {
            console.error('Erro ao atualizar status no GitHub Projects:', error);
            return false;
        }
    }

    /**
     * Add issue to GitHub Projects V2
     */
    async addIssueToProject(
        projectId: string,
        issueId: string,
        userId: string
    ): Promise<any> {
        // Invalidate project caches when adding
        invalidateCache('graphql:project');
        
        const mutation = `
            mutation($projectId: ID!, $contentId: ID!) {
                addProjectV2ItemById(input: {
                    projectId: $projectId
                    contentId: $contentId
                }) {
                    item {
                        id
                    }
                }
            }
        `;

        const variables = {
            projectId,
            contentId: issueId
        };

        return this.makeGraphQLRequest(mutation, variables, userId);
    }

    /**
     * Get issue node ID (required for adding to projects)
     */
    async getIssueNodeId(owner: string, repo: string, issueNumber: number, userId: string): Promise<string | null> {
        const query = `
            query($owner: String!, $repo: String!, $issueNumber: Int!) {
                repository(owner: $owner, name: $repo) {
                    issue(number: $issueNumber) {
                        id
                    }
                }
            }
        `;

        try {
            const cacheKey = `graphql:issueNodeId:${owner}/${repo}/${issueNumber}`;
            const data = await this.makeGraphQLRequest(query, { owner, repo, issueNumber }, userId, cacheKey, CACHE_TTL.ISSUE_DETAILS);
            return data?.repository?.issue?.id || null;
        } catch (error: any) {
            // Issue might not exist or was deleted - handle gracefully
            if (error.message?.includes('Could not resolve to an Issue')) {
                console.warn(`⚠️ Issue #${issueNumber} não encontrada no repositório ${owner}/${repo}`);
                return null;
            }
            console.error('Erro ao buscar issue node ID:', error);
            return null;
        }
    }

    /**
     * Ensure issue is in a project, adding it if necessary
     * Returns the project item ID
     */
    async ensureIssueInProject(
        owner: string,
        repo: string,
        issueNumber: number,
        userId: string
    ): Promise<string | null> {
        try {
            // Validate issue number
            if (!issueNumber || issueNumber <= 0) {
                console.warn(`⚠️ Número de issue inválido: ${issueNumber}`);
                return null;
            }

            // Check if issue is already in a project
            const projectItems = await this.getIssueProjectItem(owner, repo, issueNumber, userId);

            // If empty array returned, issue might not exist - don't try to add it
            if (projectItems && projectItems.length > 0) {
                return projectItems[0].id;
            }

            // Get repository projects
            const projects = await this.getRepositoryProjects(owner, repo, userId);

            if (!projects || projects.length === 0) {
                return null;
            }

            // Use the first project
            const project = projects[0];

            // Get issue node ID
            const issueNodeId = await this.getIssueNodeId(owner, repo, issueNumber, userId);

            if (!issueNodeId) {
                console.error('Não foi possível obter o ID da issue');
                return null;
            }

            // Add issue to project
            const result = await this.addIssueToProject(project.id, issueNodeId, userId);

            if (result?.addProjectV2ItemById?.item?.id) {
                return result.addProjectV2ItemById.item.id;
            }

            return null;
        } catch (error: any) {
            // Don't log error for non-existent issues - already handled
            if (!error.message?.includes('Could not resolve to an Issue')) {
                console.error('Erro ao adicionar issue ao projeto:', error);
            }
            return null;
        }
    }

    /**
     * Search repositories
     */
    async searchRepositories(query: string, userId: string): Promise<GitHubRepo[]> {
        const data = await this.makeRequest(
            `/search/repositories?q=${encodeURIComponent(query)}&per_page=30`,
            userId,
            {},
            CACHE_TTL.DEFAULT
        );
        return data.items || [];
    }

    /**
     * Get repository details
     */
    async getRepository(owner: string, repo: string, userId: string): Promise<GitHubRepo> {
        return this.makeRequest(`/repos/${owner}/${repo}`, userId, {}, CACHE_TTL.USER_REPOS);
    }

    /**
     * Check if user is authenticated with GitHub
     */
    async isAuthenticated(userId: string): Promise<boolean> {
        try {
            const token = await this.getUserToken(userId);
            if (!token) return false;

            await this.getUserProfile(userId);
            return true;
        } catch {
            return false;
        }
    }

    // ==================== PULL REQUESTS ====================

    /**
     * List pull requests
     */
    async getPullRequests(
        owner: string,
        repo: string,
        userId: string,
        options: {
            state?: 'open' | 'closed' | 'all';
            sort?: 'created' | 'updated' | 'popularity' | 'long-running';
            direction?: 'asc' | 'desc';
            per_page?: number;
            page?: number;
        } = {}
    ): Promise<any[]> {
        const {
            state = 'open',
            sort = 'created',
            direction = 'desc',
            per_page = 30,
            page = 1,
        } = options;

        const queryParams = new URLSearchParams({
            state,
            sort,
            direction,
            per_page: per_page.toString(),
            page: page.toString(),
        });

        return this.makeRequest(
            `/repos/${owner}/${repo}/pulls?${queryParams}`,
            userId,
            {},
            CACHE_TTL.REPO_ISSUES
        );
    }

    /**
     * Get a single pull request
     */
    async getPullRequest(
        owner: string,
        repo: string,
        pullNumber: number,
        userId: string
    ): Promise<any> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/pulls/${pullNumber}`,
            userId,
            {},
            CACHE_TTL.ISSUE_DETAILS
        );
    }

    /**
     * Create a pull request
     */
    async createPullRequest(
        owner: string,
        repo: string,
        data: {
            title: string;
            body?: string;
            head: string;
            base: string;
            draft?: boolean;
            maintainer_can_modify?: boolean;
        },
        userId: string
    ): Promise<any> {
        invalidateCache(`/repos/${owner}/${repo}/pulls`);
        return this.makeRequest(
            `/repos/${owner}/${repo}/pulls`,
            userId,
            {
                method: 'POST',
                body: JSON.stringify(data),
            },
            0
        );
    }

    /**
     * Update a pull request
     */
    async updatePullRequest(
        owner: string,
        repo: string,
        pullNumber: number,
        updates: {
            title?: string;
            body?: string;
            state?: 'open' | 'closed';
            base?: string;
            maintainer_can_modify?: boolean;
        },
        userId: string
    ): Promise<any> {
        invalidateCache(`/repos/${owner}/${repo}/pulls`);
        invalidateCache(`/repos/${owner}/${repo}/pulls/${pullNumber}`);

        return this.makeRequest(
            `/repos/${owner}/${repo}/pulls/${pullNumber}`,
            userId,
            {
                method: 'PATCH',
                body: JSON.stringify(updates),
            },
            0
        );
    }

    /**
     * Merge a pull request
     */
    async mergePullRequest(
        owner: string,
        repo: string,
        pullNumber: number,
        options: {
            commit_title?: string;
            commit_message?: string;
            sha?: string;
            merge_method?: 'merge' | 'squash' | 'rebase';
        } = {},
        userId: string
    ): Promise<any> {
        invalidateCache(`/repos/${owner}/${repo}/pulls`);
        invalidateCache(`/repos/${owner}/${repo}/pulls/${pullNumber}`);

        return this.makeRequest(
            `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
            userId,
            {
                method: 'PUT',
                body: JSON.stringify(options),
            },
            0
        );
    }

    /**
     * List pull request reviews
     */
    async getPullRequestReviews(
        owner: string,
        repo: string,
        pullNumber: number,
        userId: string
    ): Promise<any[]> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
            userId,
            {},
            CACHE_TTL.ISSUE_DETAILS
        );
    }

    /**
     * List pull request files
     */
    async getPullRequestFiles(
        owner: string,
        repo: string,
        pullNumber: number,
        userId: string
    ): Promise<any[]> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/pulls/${pullNumber}/files`,
            userId,
            {},
            CACHE_TTL.ISSUE_DETAILS
        );
    }

    /**
     * List pull request commits
     */
    async getPullRequestCommits(
        owner: string,
        repo: string,
        pullNumber: number,
        userId: string
    ): Promise<any[]> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/pulls/${pullNumber}/commits`,
            userId,
            {},
            CACHE_TTL.ISSUE_DETAILS
        );
    }

    /**
     * Check if pull request is merged
     */
    async isPullRequestMerged(
        owner: string,
        repo: string,
        pullNumber: number,
        userId: string
    ): Promise<boolean> {
        try {
            await this.makeRequest(
                `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
                userId,
                { method: 'GET' },
                CACHE_TTL.ISSUE_DETAILS
            );
            return true;
        } catch (error: any) {
            if (error.status === 404) return false;
            throw error;
        }
    }

    // ==================== MILESTONES ====================

    /**
     * List milestones
     */
    async getMilestones(
        owner: string,
        repo: string,
        userId: string,
        options: {
            state?: 'open' | 'closed' | 'all';
            sort?: 'due_on' | 'completeness';
            direction?: 'asc' | 'desc';
        } = {}
    ): Promise<any[]> {
        const { state = 'open', sort = 'due_on', direction = 'asc' } = options;

        const queryParams = new URLSearchParams({
            state,
            sort,
            direction,
        });

        return this.makeRequest(
            `/repos/${owner}/${repo}/milestones?${queryParams}`,
            userId,
            {},
            CACHE_TTL.REPO_ISSUES
        );
    }

    /**
     * Get a milestone
     */
    async getMilestone(
        owner: string,
        repo: string,
        milestoneNumber: number,
        userId: string
    ): Promise<any> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/milestones/${milestoneNumber}`,
            userId,
            {},
            CACHE_TTL.ISSUE_DETAILS
        );
    }

    /**
     * Create a milestone
     */
    async createMilestone(
        owner: string,
        repo: string,
        data: {
            title: string;
            description?: string;
            due_on?: string;
            state?: 'open' | 'closed';
        },
        userId: string
    ): Promise<any> {
        invalidateCache(`/repos/${owner}/${repo}/milestones`);
        return this.makeRequest(
            `/repos/${owner}/${repo}/milestones`,
            userId,
            {
                method: 'POST',
                body: JSON.stringify(data),
            },
            0
        );
    }

    /**
     * Update a milestone
     */
    async updateMilestone(
        owner: string,
        repo: string,
        milestoneNumber: number,
        updates: {
            title?: string;
            description?: string;
            due_on?: string;
            state?: 'open' | 'closed';
        },
        userId: string
    ): Promise<any> {
        invalidateCache(`/repos/${owner}/${repo}/milestones`);
        invalidateCache(`/repos/${owner}/${repo}/milestones/${milestoneNumber}`);

        return this.makeRequest(
            `/repos/${owner}/${repo}/milestones/${milestoneNumber}`,
            userId,
            {
                method: 'PATCH',
                body: JSON.stringify(updates),
            },
            0
        );
    }

    /**
     * Delete a milestone
     */
    async deleteMilestone(
        owner: string,
        repo: string,
        milestoneNumber: number,
        userId: string
    ): Promise<void> {
        invalidateCache(`/repos/${owner}/${repo}/milestones`);
        await this.makeRequest(
            `/repos/${owner}/${repo}/milestones/${milestoneNumber}`,
            userId,
            { method: 'DELETE' },
            0
        );
    }

    // ==================== GITHUB ACTIONS ====================

    /**
     * List repository workflows
     */
    async getWorkflows(owner: string, repo: string, userId: string): Promise<any> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/actions/workflows`,
            userId,
            {},
            CACHE_TTL.DEFAULT
        );
    }

    /**
     * List workflow runs
     */
    async getWorkflowRuns(
        owner: string,
        repo: string,
        userId: string,
        options: {
            workflow_id?: number | string;
            actor?: string;
            branch?: string;
            event?: string;
            status?: 'queued' | 'in_progress' | 'completed';
            per_page?: number;
            page?: number;
        } = {}
    ): Promise<any> {
        const queryParams = new URLSearchParams();
        
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                queryParams.append(key, value.toString());
            }
        });

        const queryString = queryParams.toString();
        const endpoint = `/repos/${owner}/${repo}/actions/runs${queryString ? `?${queryString}` : ''}`;

        return this.makeRequest(endpoint, userId, {}, CACHE_TTL.DEFAULT);
    }

    /**
     * Get a workflow run
     */
    async getWorkflowRun(
        owner: string,
        repo: string,
        runId: number,
        userId: string
    ): Promise<any> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/actions/runs/${runId}`,
            userId,
            {},
            CACHE_TTL.DEFAULT
        );
    }

    /**
     * List workflow run jobs
     */
    async getWorkflowRunJobs(
        owner: string,
        repo: string,
        runId: number,
        userId: string,
        options: {
            filter?: 'latest' | 'all';
            per_page?: number;
            page?: number;
        } = {}
    ): Promise<any> {
        const queryParams = new URLSearchParams();
        
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                queryParams.append(key, value.toString());
            }
        });

        const queryString = queryParams.toString();
        const endpoint = `/repos/${owner}/${repo}/actions/runs/${runId}/jobs${queryString ? `?${queryString}` : ''}`;

        return this.makeRequest(endpoint, userId, {}, CACHE_TTL.DEFAULT);
    }

    /**
     * Get workflow run artifacts
     */
    async getWorkflowRunArtifacts(
        owner: string,
        repo: string,
        runId: number,
        userId: string
    ): Promise<any> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`,
            userId,
            {},
            CACHE_TTL.DEFAULT
        );
    }

    /**
     * Download workflow run logs
     */
    async downloadWorkflowRunLogs(
        owner: string,
        repo: string,
        runId: number,
        userId: string
    ): Promise<any> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/actions/runs/${runId}/logs`,
            userId,
            {},
            0
        );
    }

    /**
     * Cancel a workflow run
     */
    async cancelWorkflowRun(
        owner: string,
        repo: string,
        runId: number,
        userId: string
    ): Promise<any> {
        invalidateCache(`/repos/${owner}/${repo}/actions/runs`);
        return this.makeRequest(
            `/repos/${owner}/${repo}/actions/runs/${runId}/cancel`,
            userId,
            { method: 'POST' },
            0
        );
    }

    /**
     * Re-run a workflow
     */
    async rerunWorkflow(
        owner: string,
        repo: string,
        runId: number,
        userId: string
    ): Promise<any> {
        invalidateCache(`/repos/${owner}/${repo}/actions/runs`);
        return this.makeRequest(
            `/repos/${owner}/${repo}/actions/runs/${runId}/rerun`,
            userId,
            { method: 'POST' },
            0
        );
    }

    /**
     * Get workflow run usage (billing)
     */
    async getWorkflowRunUsage(
        owner: string,
        repo: string,
        runId: number,
        userId: string
    ): Promise<any> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/actions/runs/${runId}/timing`,
            userId,
            {},
            CACHE_TTL.DEFAULT
        );
    }

    /**
     * Trigger a workflow dispatch
     */
    async triggerWorkflow(
        owner: string,
        repo: string,
        workflowId: number | string,
        ref: string,
        userId: string,
        inputs?: Record<string, string>
    ): Promise<void> {
        invalidateCache(`/repos/${owner}/${repo}/actions/runs`);
        await this.makeRequest(
            `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
            userId,
            {
                method: 'POST',
                body: JSON.stringify({ ref, inputs: inputs || {} }),
            },
            0
        );
    }

    /**
     * Get a single workflow job
     */
    async getWorkflowJob(
        owner: string,
        repo: string,
        jobId: number,
        userId: string
    ): Promise<any> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/actions/jobs/${jobId}`,
            userId,
            {},
            CACHE_TTL.DEFAULT
        );
    }

    // ==================== COMMITS ====================

    /**
     * List commits
     */
    async getCommits(
        owner: string,
        repo: string,
        userId: string,
        options: {
            sha?: string;
            path?: string;
            author?: string;
            since?: string;
            until?: string;
            per_page?: number;
            page?: number;
        } = {}
    ): Promise<any[]> {
        const queryParams = new URLSearchParams();
        
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                queryParams.append(key, value.toString());
            }
        });

        const queryString = queryParams.toString();
        const endpoint = `/repos/${owner}/${repo}/commits${queryString ? `?${queryString}` : ''}`;

        return this.makeRequest(endpoint, userId, {}, CACHE_TTL.DEFAULT);
    }

    /**
     * Get a commit
     */
    async getCommit(
        owner: string,
        repo: string,
        ref: string,
        userId: string
    ): Promise<any> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/commits/${ref}`,
            userId,
            {},
            CACHE_TTL.DEFAULT
        );
    }

    /**
     * Compare two commits
     */
    async compareCommits(
        owner: string,
        repo: string,
        base: string,
        head: string,
        userId: string
    ): Promise<any> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/compare/${base}...${head}`,
            userId,
            {},
            CACHE_TTL.DEFAULT
        );
    }

    // ==================== RELEASES ====================

    /**
     * List releases
     */
    async getReleases(
        owner: string,
        repo: string,
        userId: string,
        options: {
            per_page?: number;
            page?: number;
        } = {}
    ): Promise<any[]> {
        const { per_page = 30, page = 1 } = options;

        const queryParams = new URLSearchParams({
            per_page: per_page.toString(),
            page: page.toString(),
        });

        return this.makeRequest(
            `/repos/${owner}/${repo}/releases?${queryParams}`,
            userId,
            {},
            CACHE_TTL.DEFAULT
        );
    }

    /**
     * Get latest release
     */
    async getLatestRelease(owner: string, repo: string, userId: string): Promise<any> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/releases/latest`,
            userId,
            {},
            CACHE_TTL.DEFAULT
        );
    }

    /**
     * Get a release by tag
     */
    async getReleaseByTag(
        owner: string,
        repo: string,
        tag: string,
        userId: string
    ): Promise<any> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/releases/tags/${tag}`,
            userId,
            {},
            CACHE_TTL.DEFAULT
        );
    }

    // ==================== BRANCHES ====================

    /**
     * List branches
     */
    async getBranches(
        owner: string,
        repo: string,
        userId: string,
        options: {
            protected?: boolean;
            per_page?: number;
            page?: number;
        } = {}
    ): Promise<any[]> {
        const queryParams = new URLSearchParams();
        
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                queryParams.append(key, value.toString());
            }
        });

        const queryString = queryParams.toString();
        const endpoint = `/repos/${owner}/${repo}/branches${queryString ? `?${queryString}` : ''}`;

        return this.makeRequest(endpoint, userId, {}, CACHE_TTL.DEFAULT);
    }

    /**
     * Get a branch
     */
    async getBranch(
        owner: string,
        repo: string,
        branch: string,
        userId: string
    ): Promise<any> {
        return this.makeRequest(
            `/repos/${owner}/${repo}/branches/${branch}`,
            userId,
            {},
            CACHE_TTL.DEFAULT
        );
    }
}

export const githubService = new GitHubService();
