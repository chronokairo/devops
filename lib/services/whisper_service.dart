import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:permission_handler/permission_handler.dart';

class WhisperService extends ChangeNotifier {
  final SpeechToText _speechToText = SpeechToText();
  bool _isListening = false;
  bool _isInitialized = false;
  String _lastWords = '';
  double _confidence = 0.0;
  Timer? _listeningTimer;

  bool get isListening => _isListening;
  bool get isInitialized => _isInitialized;
  String get lastWords => _lastWords;
  double get confidence => _confidence;

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
      _confidence = 0.0;
      notifyListeners();

      await _speechToText.listen(
        onResult: (result) {
          _lastWords = result.recognizedWords;
          _confidence = result.confidence;
          notifyListeners();
        },
        listenFor: const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 3),
        listenOptions: SpeechListenOptions(
          partialResults: true,
        ),
        onSoundLevelChange: (level) {
          // Handle sound level changes for visualization
        },
      );

      // Auto-stop after 30 seconds
      _listeningTimer = Timer(const Duration(seconds: 30), () {
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
