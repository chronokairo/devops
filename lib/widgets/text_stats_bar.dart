import 'package:flutter/material.dart';

/// Widget to display text statistics like word count, character count, and line count
class TextStatsBar extends StatelessWidget {
  final int wordCount;
  final int charCount;
  final int lineCount;

  const TextStatsBar({
    super.key,
    required this.wordCount,
    required this.charCount,
    required this.lineCount,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey[900]?.withOpacity(0.5),
        border: Border(top: BorderSide(color: Colors.cyan.withOpacity(0.3))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem('Palavras', wordCount.toString(), Icons.text_fields),
          _buildStatItem('Caracteres', charCount.toString(), Icons.text_format),
          _buildStatItem('Linhas', lineCount.toString(), Icons.format_list_numbered),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: Colors.cyan, size: 16),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            color: Colors.cyan,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: Colors.grey[400],
            fontSize: 10,
          ),
        ),
      ],
    );
  }
}
