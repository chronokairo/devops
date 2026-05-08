// Deploys Service - Firebase + GitHub Integration
// @ts-ignore
import { db } from '@/shared/api/firebase/firebase';
import type { Firestore } from 'firebase/firestore';
import { collection, doc, setDoc, getDocs, query, where, orderBy, limit, Timestamp, deleteDoc, updateDoc } from 'firebase/firestore';

// Type assertion for db to avoid implicit any
// @ts-ignore
const firestoreDb: Firestore = db as any;
import type { Deployment, DeploymentConfig, PipelineStats } from '../types';

const DEPLOYMENTS_COLLECTION = 'deployments';
const DEPLOYMENT_CONFIGS_COLLECTION = 'deployment_configs';

export const deploysService = {
  // ===== Deployments =====
  
  async saveDeployment(orgId: string, deployment: Deployment): Promise<void> {
    const ref = doc(firestoreDb, 'organizations', orgId, DEPLOYMENTS_COLLECTION, deployment.id);
    await setDoc(ref, {
      ...deployment,
      created_at: Timestamp.fromDate(new Date(deployment.created_at)),
      updated_at: Timestamp.now(),
    });
  },

  async getDeployments(orgId: string, repository?: string, limit_count: number = 50): Promise<Deployment[]> {
    let q = query(
      collection(firestoreDb, 'organizations', orgId, DEPLOYMENTS_COLLECTION),
      orderBy('created_at', 'desc'),
      limit(limit_count)
    );
    
    if (repository) {
      q = query(
        collection(firestoreDb, 'organizations', orgId, DEPLOYMENTS_COLLECTION),
        where('repository', '==', repository),
        orderBy('created_at', 'desc'),
        limit(limit_count)
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
      } as Deployment;
    });
  },

  async updateDeploymentStatus(
    orgId: string, 
    deploymentId: string, 
    status: Deployment['status'],
    url?: string
  ): Promise<void> {
    const ref = doc(firestoreDb, 'organizations', orgId, DEPLOYMENTS_COLLECTION, deploymentId);
    await updateDoc(ref, {
      status,
      ...(url && { url }),
      updated_at: Timestamp.now(),
    });
  },

  // ===== Deployment Configs =====

  async saveDeploymentConfig(orgId: string, config: DeploymentConfig): Promise<void> {
    const ref = doc(firestoreDb, 'organizations', orgId, DEPLOYMENT_CONFIGS_COLLECTION, config.id);
    await setDoc(ref, {
      ...config,
      created_at: Timestamp.fromDate(new Date(config.created_at)),
      updated_at: Timestamp.now(),
    });
  },

  async getDeploymentConfigs(orgId: string): Promise<DeploymentConfig[]> {
    const q = query(
      collection(firestoreDb, 'organizations', orgId, DEPLOYMENT_CONFIGS_COLLECTION),
      orderBy('created_at', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
      } as DeploymentConfig;
    });
  },

  async deleteDeploymentConfig(orgId: string, configId: string): Promise<void> {
    const ref = doc(firestoreDb, 'organizations', orgId, DEPLOYMENT_CONFIGS_COLLECTION, configId);
    await deleteDoc(ref);
  },

  // ===== Stats =====

  async getPipelineStats(orgId: string): Promise<PipelineStats> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const deploymentsQuery = query(
      collection(firestoreDb, 'organizations', orgId, DEPLOYMENTS_COLLECTION),
      where('created_at', '>=', Timestamp.fromDate(weekAgo))
    );
    
    const snapshot = await getDocs(deploymentsQuery);
    const deployments = snapshot.docs.map(d => d.data() as Deployment);
    
    const successfulDeployments = deployments.filter(d => d.status === 'success').length;
    
    return {
      total_runs: deployments.length,
      success_rate: deployments.length > 0 ? (successfulDeployments / deployments.length) * 100 : 0,
      avg_duration_minutes: 0, // Calculated from workflow runs
      runs_this_week: deployments.length,
      deployments_this_week: deployments.filter(d => d.status === 'success').length,
    };
  },
};
