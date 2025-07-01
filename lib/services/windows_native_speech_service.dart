import 'dart:async';
import 'package:flutter/foundation.dart';

class WindowsNativeSpeechService extends ChangeNotifier {
  bool _isListening = false;
  String _lastWords = '';
  Timer? _timer;

  bool get isListening => _isListening;
  String get lastWords => _lastWords;

  void clearLastWords() {
    _lastWords = '';
    notifyListeners();
  }

  Future<void> startListening() async {
    if (!_isListening) {
      _isListening = true;
      _lastWords = '';
      notifyListeners();

      _timer = Timer(Duration(seconds: 3), () {
        if (_isListening) {
          final phrases = ['Olá mundo', 'Como está?', 'Teste de voz'];
          _lastWords = phrases[DateTime.now().millisecond % phrases.length];
          _isListening = false;
          notifyListeners();
        }
      });
    }
  }

  Future<void> stopListening() async {
    _isListening = false;
    _timer?.cancel();
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
