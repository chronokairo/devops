class VoiceCommand {
  final String id;
  final String command;
  final String response;
  final DateTime timestamp;
  final double confidence;

  VoiceCommand({
    required this.id,
    required this.command,
    required this.response,
    required this.timestamp,
    required this.confidence,
  });

  factory VoiceCommand.fromJson(Map<String, dynamic> json) {
    return VoiceCommand(
      id: json['id'],
      command: json['command'],
      response: json['response'],
      timestamp: DateTime.parse(json['timestamp']),
      confidence: json['confidence'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'command': command,
      'response': response,
      'timestamp': timestamp.toIso8601String(),
      'confidence': confidence,
    };
  }
}
