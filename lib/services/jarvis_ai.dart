import 'dart:math';
import 'package:flutter/foundation.dart';
import '../models/voice_command.dart';

class JarvisAI extends ChangeNotifier {
  final List<VoiceCommand> _commandHistory = [];
  bool _isProcessing = false;

  List<VoiceCommand> get commandHistory => List.unmodifiable(_commandHistory);
  bool get isProcessing => _isProcessing;

  final Map<String, List<String>> _responses = {
    'saudação': [
      'Olá! Como posso ajudá-lo hoje?',
      'Oi! Em que posso ser útil?',
      'Saudações! O que você gostaria de fazer?',
      'Olá! Estou aqui para ajudar.',
    ],
    'despedida': [
      'Até logo! Foi um prazer ajudar.',
      'Tchau! Estarei aqui quando precisar.',
      'Até mais! Tenha um ótimo dia.',
      'Nos vemos em breve!',
    ],
    'tempo': [
      'O tempo está interessante hoje!',
      'Parece que o clima está agradável.',
      'O dia está perfeito para atividades ao ar livre.',
    ],
    'hora': [
      'Agora são ${DateTime.now().hour}:${DateTime.now().minute.toString().padLeft(2, '0')}',
      'A hora atual é ${DateTime.now().hour}:${DateTime.now().minute.toString().padLeft(2, '0')}',
    ],
    'data': [
      'Hoje é ${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}',
    ],
    'ajuda': [
      'Posso ajudar com informações sobre tempo, hora, data, cálculos simples e conversas.',
      'Estou aqui para responder suas perguntas sobre diversos tópicos.',
      'Você pode me perguntar sobre hora, data, fazer cálculos ou apenas conversar.',
    ],
    'calculadora': [
      'Preciso dos números para fazer o cálculo.',
      'Me diga qual operação matemática você quer fazer.',
      'Estou pronto para fazer cálculos!',
    ],
    'default': [
      'Interessante! Me conte mais sobre isso.',
      'Entendi. Em que mais posso ajudar?',
      'Isso é fascinante! Quer conversar mais sobre o assunto?',
      'Compreendo. Há algo específico em que posso auxiliar?',
      'Hmm, não tenho certeza sobre isso. Pode reformular a pergunta?',
    ],
  };

  Future<String> processCommand(String command) async {
    _isProcessing = true;
    notifyListeners();

    await Future.delayed(const Duration(milliseconds: 500)); // Simula processamento

    final response = _generateResponse(command);
    final voiceCommand = VoiceCommand(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      command: command,
      response: response,
      timestamp: DateTime.now(),
      confidence: 0.95,
    );

    _commandHistory.add(voiceCommand);
    _isProcessing = false;
    notifyListeners();

    return response;
  }

  String _generateResponse(String command) {
    final lowerCommand = command.toLowerCase();

    // Saudações
    if (_containsAny(lowerCommand, ['olá', 'oi', 'hey', 'e aí', 'bom dia', 'boa tarde', 'boa noite'])) {
      return _getRandomResponse('saudação');
    }

    // Despedidas
    if (_containsAny(lowerCommand, ['tchau', 'até logo', 'até mais', 'bye', 'adeus'])) {
      return _getRandomResponse('despedida');
    }

    // Hora
    if (_containsAny(lowerCommand, ['que horas', 'hora', 'horário'])) {
      return _getRandomResponse('hora');
    }

    // Data
    if (_containsAny(lowerCommand, ['que dia', 'data', 'hoje'])) {
      final now = DateTime.now();
      final monthName = _getMonth(now.month);
      return 'Hoje é ${now.day} de $monthName de ${now.year}';
    }

    // Tempo/Clima
    if (_containsAny(lowerCommand, ['tempo', 'clima', 'chuva', 'sol'])) {
      return _getRandomResponse('tempo');
    }

    // Ajuda
    if (_containsAny(lowerCommand, ['ajuda', 'help', 'o que você faz', 'comandos'])) {
      return _getRandomResponse('ajuda');
    }

    // Cálculos simples
    if (_containsAny(lowerCommand, ['calcular', 'somar', 'multiplicar', 'dividir', 'subtrair', '+', '-', '*', '/'])) {
      return _performCalculation(lowerCommand);
    }

    // Nome do Jarvis
    if (_containsAny(lowerCommand, ['seu nome', 'quem é você', 'jarvis'])) {
      return 'Eu sou Jarvis, seu assistente virtual inteligente. Estou aqui para ajudar!';
    }

    // Resposta padrão
    return _getRandomResponse('default');
  }

  String _performCalculation(String command) {
    try {
      // Extrair números e operações básicas
      final RegExp numberRegex = RegExp(r'\d+\.?\d*');
      final List<String> numbers = numberRegex.allMatches(command).map((m) => m.group(0)!).toList();
      
      if (numbers.length >= 2) {
        final double num1 = double.parse(numbers[0]);
        final double num2 = double.parse(numbers[1]);
        
        if (command.contains('soma') || command.contains('+')) {
          return '$num1 mais $num2 é igual a ${num1 + num2}';
        } else if (command.contains('subtrai') || command.contains('-')) {
          return '$num1 menos $num2 é igual a ${num1 - num2}';
        } else if (command.contains('multiplica') || command.contains('*') || command.contains('vezes')) {
          return '$num1 vezes $num2 é igual a ${num1 * num2}';
        } else if (command.contains('divid') || command.contains('/')) {
          if (num2 != 0) {
            return '$num1 dividido por $num2 é igual a ${num1 / num2}';
          } else {
            return 'Não é possível dividir por zero!';
          }
        }
      }
      return _getRandomResponse('calculadora');
    } catch (e) {
      return 'Desculpe, não consegui entender o cálculo. Tente algo como "quanto é 5 mais 3?"';
    }
  }

  bool _containsAny(String text, List<String> words) {
    return words.any((word) => text.contains(word));
  }

  String _getRandomResponse(String category) {
    final responses = _responses[category] ?? _responses['default']!;
    return responses[Random().nextInt(responses.length)];
  }

  String _getMonth(int month) {
    const months = [
      '', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return months[month];
  }

  void clearHistory() {
    _commandHistory.clear();
    notifyListeners();
  }
}
