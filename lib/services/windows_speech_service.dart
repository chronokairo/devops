import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';

class WindowsSpeechService extends ChangeNotifier {
  bool _isListening = false;
  bool _isInitialized = false;
  String _lastWords = '';
  String _partialWords = '';
  Timer? _listeningTimer;

  bool get isListening => _isListening;
  bool get isInitialized => _isInitialized;
  String get lastWords => _lastWords;
  String get partialWords => _partialWords;

  void clearLastWords() {
    _lastWords = '';
    _partialWords = '';

    // Defer notification to avoid calling during build
    Future.delayed(Duration.zero, () {
      notifyListeners();
    });
  }

  Future<bool> initialize() async {
    try {
      if (Platform.isWindows) {
        // Para Windows, vamos simular o reconhecimento por enquanto
        // Em uma implementação completa, você poderia usar FFI para chamar
        // as APIs nativas do Windows Speech Recognition
        _isInitialized = true;
        debugPrint('Windows Speech Service initialized (simulation mode)');

        // Use Future.delayed to avoid calling notifyListeners during build
        Future.delayed(Duration.zero, () {
          notifyListeners();
        });

        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error initializing Windows speech recognition: $e');
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

      // Defer notification to avoid calling during build
      Future.delayed(Duration.zero, () {
        notifyListeners();
      });

      debugPrint('Started Windows speech recognition (simulation)');

      // Simulação de reconhecimento para demonstração
      // Em produção, aqui você chamaria as APIs nativas do Windows
      _startSimulatedRecognition();
    }
  }

  void _startSimulatedRecognition() {
    // Simula palavras parciais sendo reconhecidas
    Timer(const Duration(seconds: 1), () {
      if (_isListening) {
        _partialWords = 'Olá';
        Future.delayed(Duration.zero, () {
          notifyListeners();
        });
      }
    });

    Timer(const Duration(seconds: 2), () {
      if (_isListening) {
        _partialWords = 'Olá mundo';
        Future.delayed(Duration.zero, () {
          notifyListeners();
        });
      }
    });

    Timer(const Duration(seconds: 3), () {
      if (_isListening) {
        _partialWords = 'Olá mundo este é um teste';
        Future.delayed(Duration.zero, () {
          notifyListeners();
        });
      }
    });

    // Simula resultado final após 4 segundos
    Timer(const Duration(seconds: 4), () {
      if (_isListening) {
        _lastWords =
            'Olá mundo, este é um teste de reconhecimento de voz no Windows.';
        _partialWords = '';
        _isListening = false;
        debugPrint('Simulated speech recognition completed: $_lastWords');
        Future.delayed(Duration.zero, () {
          notifyListeners();
        });
      }
    });
  }

  Future<void> stopListening() async {
    _stopListening();
  }

  void _stopListening() {
    if (_isListening) {
      _isListening = false;
      _listeningTimer?.cancel();
      _listeningTimer = null;
      debugPrint('Stopped Windows speech recognition');

      // Defer notification to avoid calling during build
      Future.delayed(Duration.zero, () {
        notifyListeners();
      });
    }
  }

  @override
  void dispose() {
    _stopListening();
    super.dispose();
  }
}
