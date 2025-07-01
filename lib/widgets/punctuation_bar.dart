import 'package:flutter/material.dart';

/// Widget that provides quick access to punctuation marks
class PunctuationBar extends StatelessWidget {
  final ValueChanged<String> onPunctuationSelected;

  const PunctuationBar({super.key, required this.onPunctuationSelected});

  static const List<String> _punctuations = [
    '.',
    ',',
    '!',
    '?',
    ';',
    ':',
    '"',
    '(',
    ')',
    '-',
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 50,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _punctuations.length,
        itemBuilder: (context, index) {
          final punct = _punctuations[index];
          return GestureDetector(
            onTap: () => onPunctuationSelected(punct),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.grey[800],
                borderRadius: BorderRadius.circular(15),
                border: Border.all(color: Colors.cyan.withValues(alpha: 0.3)),
              ),
              child: Text(
                punct,
                style: const TextStyle(
                  color: Colors.cyan,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
