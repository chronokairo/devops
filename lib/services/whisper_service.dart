import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:permission_handler/permission_handler.dart';

class WhisperService extends ChangeNotifier {
  final SpeechToText _speechToText = SpeechToText();
  bool _isListening = false;
  bool _isInitialized = false;
  String _lastWords = '';
  String _partialWords = '';
  double _confidence = 0.0;
  Timer? _listeningTimer;

  bool get isListening => _isListening;
  bool get isInitialized => _isInitialized;
  String get lastWords => _lastWords;
  String get partialWords => _partialWords;
  double get confidence => _confidence;

  void clearLastWords() {
    _lastWords = '';
    _partialWords = '';
    notifyListeners();
  }

  Future<bool> initialize() async {
    try {
      // Request microphone permission
      final microphonePermission = await Permission.microphone.request();
      if (microphonePermission != PermissionStatus.granted) {
        throw Exception('Microphone permission not granted');
      }

      // Initialize speech to text
      _isInitialized = await _speechToText.initialize(
        onError: (error) {
          debugPrint('Speech recognition error: ${error.errorMsg}');
          _stopListening();
        },
        onStatus: (status) {
          debugPrint('Speech recognition status: $status');
          if (status == 'done' || status == 'notListening') {
            _stopListening();
          }
        },
      );

      notifyListeners();
      return _isInitialized;
    } catch (e) {
      debugPrint('Error initializing speech recognition: $e');
      return false;
    }
  }

  Future<void> startListening() async {
    if (!_isInitialized) {
      await initialize();
    }

    if (_isInitialized && !_isListening) {
      _isListening = true;
      _lastWords = '';
      _partialWords = '';
      _confidence = 0.0;
      notifyListeners();

      await _speechToText.listen(
        onResult: (result) {
          debugPrint(
            'Speech result: "${result.recognizedWords}", final: ${result.finalResult}',
          );
          if (result.finalResult) {
            _lastWords = result.recognizedWords;
            _partialWords = '';
            _confidence = result.confidence;
            debugPrint(
              'Final result set: "$_lastWords", notifying listeners...',
            );
            notifyListeners();
          } else {
            _partialWords = result.recognizedWords;
            debugPrint('Partial result: "$_partialWords"');
            notifyListeners();
          }
        },
        listenFor: const Duration(
          seconds: 10,
        ), // Reduzir tempo para mais resultados
        pauseFor: const Duration(
          seconds: 2,
        ), // Reduzir pausa para mais responsividade
        listenOptions: SpeechListenOptions(
          partialResults: true,
          onDevice: false, // Usar reconhecimento online para melhor precisão
          cancelOnError: false,
        ),
        onSoundLevelChange: (level) {
          // Handle sound level changes for visualization
        },
      );

      // Auto-stop after 10 seconds (mais frequente para capturar resultados)
      _listeningTimer = Timer(const Duration(seconds: 10), () {
        if (_isListening) {
          stopListening();
        }
      });
    }
  }

  Future<void> stopListening() async {
    _stopListening();
  }

  void _stopListening() {
    if (_isListening) {
      _isListening = false;
      _speechToText.stop();
      _listeningTimer?.cancel();
      _listeningTimer = null;
      notifyListeners();
    }
  }

  Future<String> transcribeAudio(String audioPath) async {
    // For now, we'll use the built-in speech_to_text
    // In a real implementation, you would integrate whisper.cpp here
    // This would involve:
    // 1. Loading the whisper model
    // 2. Processing the audio file through whisper
    // 3. Returning the transcribed text

    // Placeholder implementation
    return "Transcription not yet implemented with whisper.cpp";
  }

  @override
  void dispose() {
    _stopListening();
    super.dispose();
  }
}
