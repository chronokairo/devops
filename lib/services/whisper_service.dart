import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:permission_handler/permission_handler.dart';
import 'windows_speech_service.dart';

class WhisperService extends ChangeNotifier {
  final SpeechToText _speechToText = SpeechToText();
  late final WindowsSpeechService _windowsSpeechService;
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

  WhisperService() {
    _windowsSpeechService = WindowsSpeechService();
    // Escutar mudanças do WindowsSpeechService
    _windowsSpeechService.addListener(_onWindowsSpeechUpdate);
  }
  void _onWindowsSpeechUpdate() {
    _isListening = _windowsSpeechService.isListening;
    _lastWords = _windowsSpeechService.lastWords;
    _partialWords = _windowsSpeechService.partialWords;

    // Use microtask to avoid setState during build
    scheduleMicrotask(() {
      notifyListeners();
    });
  }

  void clearLastWords() {
    if (Platform.isWindows) {
      _windowsSpeechService.clearLastWords();
    } else {
      _lastWords = '';
      _partialWords = '';
      Future.delayed(Duration.zero, () {
        notifyListeners();
      });
    }
  }

  Future<bool> initialize() async {
    try {
      if (Platform.isWindows) {
        // Usar Windows Speech Service no desktop
        _isInitialized = await _windowsSpeechService.initialize();
        debugPrint('Initialized Windows Speech Service: $_isInitialized');
        Future.delayed(Duration.zero, () {
          notifyListeners();
        });
        return _isInitialized;
      } else {
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

        Future.delayed(Duration.zero, () {
          notifyListeners();
        });
        return _isInitialized;
      }
    } catch (e) {
      debugPrint('Error initializing speech recognition: $e');
      return false;
    }
  }

  Future<void> startListening() async {
    if (!_isInitialized) {
      await initialize();
    }

    if (_isInitialized) {
      if (Platform.isWindows) {
        // Usar Windows Speech Service
        await _windowsSpeechService.startListening();
      } else {
        // Usar speech_to_text para outras plataformas
        if (!_isListening) {
          _isListening = true;
          _lastWords = '';
          _partialWords = '';
          _confidence = 0.0;
          Future.delayed(Duration.zero, () {
            notifyListeners();
          });

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
                Future.delayed(Duration.zero, () {
                  notifyListeners();
                });
              } else {
                _partialWords = result.recognizedWords;
                debugPrint('Partial result: "$_partialWords"');
                Future.delayed(Duration.zero, () {
                  notifyListeners();
                });
              }
            },
            listenFor: const Duration(seconds: 10),
            pauseFor: const Duration(seconds: 2),
            listenOptions: SpeechListenOptions(
              partialResults: true,
              onDevice: false,
              cancelOnError: false,
            ),
            onSoundLevelChange: (level) {
              // Handle sound level changes for visualization
            },
          );

          // Auto-stop after 10 seconds
          _listeningTimer = Timer(const Duration(seconds: 10), () {
            if (_isListening) {
              stopListening();
            }
          });
        }
      }
    }
  }

  Future<void> stopListening() async {
    if (Platform.isWindows) {
      await _windowsSpeechService.stopListening();
    } else {
      _stopListening();
    }
  }

  void _stopListening() {
    if (_isListening) {
      _isListening = false;
      _speechToText.stop();
      _listeningTimer?.cancel();
      _listeningTimer = null;
      Future.delayed(Duration.zero, () {
        notifyListeners();
      });
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
    _windowsSpeechService.removeListener(_onWindowsSpeechUpdate);
    _windowsSpeechService.dispose();
    super.dispose();
  }
}
