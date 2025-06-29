import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animated_text_kit/animated_text_kit.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/whisper_service.dart';
import '../services/tts_service.dart';
import '../services/jarvis_ai.dart';

class JarvisHomeScreen extends StatefulWidget {
  const JarvisHomeScreen({super.key});

  @override
  State<JarvisHomeScreen> createState() => _JarvisHomeScreenState();
}

class _JarvisHomeScreenState extends State<JarvisHomeScreen>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _voiceWaveController;
  bool _isJarvisActive = false;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();
    
    _voiceWaveController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );

    _initializeServices();
  }

  Future<void> _initializeServices() async {
    final whisperService = Provider.of<WhisperService>(context, listen: false);
    final ttsService = Provider.of<TTSService>(context, listen: false);
    
    await whisperService.initialize();
    await ttsService.initialize();
    
    setState(() {
      _isJarvisActive = true;
    });

    // Jarvis greeting
    await ttsService.speak("Olá! Eu sou o Jarvis, seu assistente virtual. Como posso ajudá-lo hoje?");
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _voiceWaveController.dispose();
    super.dispose();
  }

  Future<void> _startListening() async {
    final whisperService = Provider.of<WhisperService>(context, listen: false);
    final ttsService = Provider.of<TTSService>(context, listen: false);
    final jarvisAI = Provider.of<JarvisAI>(context, listen: false);

    if (ttsService.isSpeaking) {
      await ttsService.stop();
    }

    await whisperService.startListening();
    _voiceWaveController.repeat();

    // Listen for speech completion
    whisperService.addListener(() async {
      if (!whisperService.isListening && whisperService.lastWords.isNotEmpty) {
        _voiceWaveController.stop();
        
        // Process the command with Jarvis AI
        final response = await jarvisAI.processCommand(whisperService.lastWords);
        
        // Speak the response
        await ttsService.speak(response);
      }
    });
  }

  Future<void> _stopListening() async {
    final whisperService = Provider.of<WhisperService>(context, listen: false);
    await whisperService.stopListening();
    _voiceWaveController.stop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Consumer3<WhisperService, TTSService, JarvisAI>(
        builder: (context, whisperService, ttsService, jarvisAI, child) {
          return SafeArea(
            child: Column(
              children: [
                // Header
                _buildHeader(),
                
                // Main Jarvis Interface
                Expanded(
                  flex: 3,
                  child: _buildJarvisInterface(whisperService, ttsService, jarvisAI),
                ),
                
                // Voice Input Section
                Expanded(
                  flex: 1,
                  child: _buildVoiceInputSection(whisperService, ttsService),
                ),
                
                // Command History
                Expanded(
                  flex: 2,
                  child: _buildCommandHistory(jarvisAI),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          AnimatedTextKit(
            animatedTexts: [
              TyperAnimatedText(
                'JARVIS',
                textStyle: const TextStyle(
                  color: Colors.cyan,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
                speed: const Duration(milliseconds: 200),
              ),
            ],
            isRepeatingAnimation: false,
          ),
          const Icon(
            Icons.settings,
            color: Colors.cyan,
            size: 28,
          ),
        ],
      ),
    );
  }

  Widget _buildJarvisInterface(WhisperService whisperService, TTSService ttsService, JarvisAI jarvisAI) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Jarvis Eye/Core
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              return Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      Colors.cyan.withValues(alpha: 0.8),
                      Colors.blue.withValues(alpha: 0.4),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.7, 1.0],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.cyan.withValues(alpha: _pulseController.value * 0.5),
                      blurRadius: 30 + (_pulseController.value * 20),
                      spreadRadius: 10 + (_pulseController.value * 10),
                    ),
                  ],
                ),
                child: Center(                    child: Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.cyan.withValues(alpha: 0.9),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.cyan.withValues(alpha: 0.6),
                            blurRadius: 20,
                            spreadRadius: 5,
                          ),
                        ],
                      ),
                    child: const Icon(
                      Icons.visibility,
                      color: Colors.white,
                      size: 50,
                    ),
                  ),
                ),
              );
            },
          ).animate(
            effects: whisperService.isListening || ttsService.isSpeaking
                ? [const ScaleEffect(duration: Duration(milliseconds: 500))]
                : [],
          ),
          
          const SizedBox(height: 40),
          
          // Status Text
          Text(
            _getStatusText(whisperService, ttsService, jarvisAI),
            style: const TextStyle(
              color: Colors.cyan,
              fontSize: 18,
              fontWeight: FontWeight.w300,
            ),
            textAlign: TextAlign.center,
          ),
          
          const SizedBox(height: 20),
          
          // Last recognized speech
          if (whisperService.lastWords.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              margin: const EdgeInsets.symmetric(horizontal: 20),
              decoration: BoxDecoration(
                color: Colors.grey[900],
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.cyan.withValues(alpha: 0.3)),
              ),
              child: Text(
                whisperService.lastWords,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                ),
                textAlign: TextAlign.center,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildVoiceInputSection(WhisperService whisperService, TTSService ttsService) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Stop TTS Button
          if (ttsService.isSpeaking)
            ElevatedButton(
              onPressed: () => ttsService.stop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                shape: const CircleBorder(),
                padding: const EdgeInsets.all(20),
              ),
              child: const Icon(Icons.stop, color: Colors.white, size: 30),
            ),
          
          // Main Voice Button
          GestureDetector(
            onTap: whisperService.isListening ? _stopListening : _startListening,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: whisperService.isListening ? Colors.red : Colors.cyan,
                boxShadow: [
                  BoxShadow(
                    color: (whisperService.isListening ? Colors.red : Colors.cyan)
                        .withValues(alpha: 0.4),
                    blurRadius: 20,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: Icon(
                whisperService.isListening ? Icons.mic : Icons.mic_none,
                color: Colors.white,
                size: 40,
              ),
            ),
          ),
          
          // Clear History Button
          ElevatedButton(
            onPressed: () {
              final jarvisAI = Provider.of<JarvisAI>(context, listen: false);
              jarvisAI.clearHistory();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.grey[800],
              shape: const CircleBorder(),
              padding: const EdgeInsets.all(20),
            ),
            child: const Icon(Icons.clear, color: Colors.white, size: 30),
          ),
        ],
      ),
    );
  }

  Widget _buildCommandHistory(JarvisAI jarvisAI) {
    return Container(
      margin: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.grey[900],
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.cyan.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              color: Colors.cyan.withValues(alpha: 0.1),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(15),
                topRight: Radius.circular(15),
              ),
            ),
            child: const Row(
              children: [
                Icon(Icons.history, color: Colors.cyan, size: 20),
                SizedBox(width: 10),
                Text(
                  'Histórico de Comandos',
                  style: TextStyle(
                    color: Colors.cyan,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: jarvisAI.commandHistory.isEmpty
                ? const Center(
                    child: Text(
                      'Nenhum comando executado ainda',
                      style: TextStyle(
                        color: Colors.grey,
                        fontSize: 14,
                      ),
                    ),
                  )
                : ListView.builder(
                    itemCount: jarvisAI.commandHistory.length,
                    reverse: true,
                    itemBuilder: (context, index) {
                      final command = jarvisAI.commandHistory[
                          jarvisAI.commandHistory.length - 1 - index];
                      return Container(
                        margin: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '👤 ${command.command}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 5),
                            Text(
                              '🤖 ${command.response}',
                              style: const TextStyle(
                                color: Colors.cyan,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  String _getStatusText(WhisperService whisperService, TTSService ttsService, JarvisAI jarvisAI) {
    if (!_isJarvisActive) {
      return 'Inicializando Jarvis...';
    }
    
    if (jarvisAI.isProcessing) {
      return 'Processando comando...';
    }
    
    if (ttsService.isSpeaking) {
      return 'Jarvis está falando...';
    }
    
    if (whisperService.isListening) {
      return 'Escutando... Fale agora!';
    }
    
    return 'Pronto para ouvir. Toque no microfone para falar.';
  }
}
