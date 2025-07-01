import 'dart:async';
import 'dart:io';
import 'package:flutter/widgets.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:permission_handler/permission_handler.dart';
import 'windows_native_speech_service.dart';

class WhisperService extends ChangeNotifier {
  final SpeechToText _speechToText = SpeechToText();
  late final WindowsNativeSpeechService _windowsSpeechService;
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
    if (Platform.isWindows) {
      _windowsSpeechService = WindowsNativeSpeechService();
      _windowsSpeechService.addListener(_onWindowsSpeechUpdate);
    }
  }

  void _onWindowsSpeechUpdate() {
    if (Platform.isWindows) {
      final oldListening = _isListening;
      final oldLastWords = _lastWords;
      final oldPartialWords = _partialWords;

      _isListening = _windowsSpeechService.isListening;
      _lastWords = _windowsSpeechService.lastWords;
      _partialWords = _windowsSpeechService.partialWords;

      debugPrint(
        'Windows speech update: isListening=$_isListening, lastWords="$_lastWords", partialWords="$_partialWords"',
      );

      // Só notificar se algo mudou
      if (oldListening != _isListening ||
          oldLastWords != _lastWords ||
          oldPartialWords != _partialWords) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          notifyListeners();
        });
      }
    }
  }

  void clearLastWords() {
    debugPrint('WhisperService.clearLastWords() called');
    _lastWords = '';
    _partialWords = '';
    if (Platform.isWindows) {
      _windowsSpeechService.clearLastWords();
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      notifyListeners();
    });
  }

  Future<bool> initialize() async {
    try {
      debugPrint('Initializing speech recognition...');

      // No Windows, usar diretamente o serviço nativo
      if (Platform.isWindows) {
        debugPrint('Using Windows native speech service directly');
        _isInitialized = await _windowsSpeechService.initialize();
        debugPrint('Windows speech service initialized: $_isInitialized');
        notifyListeners();
        return _isInitialized;
      }

      // Para outras plataformas, usar speech_to_text
      debugPrint('Requesting microphone permission...');
      final microphonePermission = await Permission.microphone.request();
      debugPrint('Microphone permission status: $microphonePermission');

      if (microphonePermission != PermissionStatus.granted) {
        debugPrint('Microphone permission denied');
        throw Exception('Microphone permission not granted');
      }

      // Check if speech recognition is available
      bool available = await _speechToText.initialize(
        onError: (error) {
          debugPrint('Speech recognition error: ${error.errorMsg}');
          _stopListening();
        },
        onStatus: (status) {
          debugPrint('Speech recognition status: $status');
          if (status == 'done' || status == 'notListening') {
            debugPrint('Speech recognition completed, stopping...');
            _stopListening();
          }
        },
      );

      _isInitialized = available;
      debugPrint('Speech Recognition initialized: $_isInitialized');
      notifyListeners();
      return _isInitialized;
    } catch (e) {
      debugPrint('Error initializing speech recognition: $e');
      return false;
    }
  }

  Future<void> startListening() async {
    debugPrint('WhisperService.startListening() called');

    if (!_isInitialized) {
      debugPrint('Service not initialized, initializing...');
      await initialize();
    }

    if (!_isInitialized) {
      debugPrint('Failed to initialize service');
      return;
    }

    // No Windows, usar apenas o serviço nativo
    if (Platform.isWindows) {
      debugPrint('Using Windows native speech service');
      await _windowsSpeechService.startListening();
      return;
    }

    // Para outras plataformas, usar speech_to_text
    try {
      if (_speechToText.isAvailable) {
        debugPrint('Using speech_to_text for recognition');
        await _startSpeechToText();
      } else {
        debugPrint('No speech recognition available');
      }
    } catch (e) {
      debugPrint('Error in startListening: $e');
    }
  }

  Future<void> _startSpeechToText() async {
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
        listenFor: const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 3),
        listenOptions: SpeechListenOptions(
          partialResults: true,
          onDevice: false,
          cancelOnError: false,
        ),
        onSoundLevelChange: (level) {
          // Handle sound level changes for visualization
        },
      );

      // Auto-stop após 30 segundos
      _listeningTimer = Timer(const Duration(seconds: 30), () {
        if (_isListening) {
          stopListening();
        }
      });
    }
  }

  Future<void> stopListening() async {
    if (_speechToText.isAvailable && _speechToText.isListening) {
      await _speechToText.stop();
    }
    if (Platform.isWindows) {
      await _windowsSpeechService.stopListening();
    }
    _stopListening();
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
    if (Platform.isWindows) {
      _windowsSpeechService.removeListener(_onWindowsSpeechUpdate);
      _windowsSpeechService.dispose();
    }
    super.dispose();
  }
}
