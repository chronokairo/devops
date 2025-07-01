import 'package:flutter/material.dart';

/// Widget that displays action buttons for recording, copying, speaking, and clearing
class ActionButtonsWidget extends StatelessWidget {
  final bool isListening;
  final VoidCallback onStartListening;
  final VoidCallback onStopListening;
  final VoidCallback onCopy;
  final VoidCallback onSpeak;
  final VoidCallback onClear;

  const ActionButtonsWidget({
    super.key,
    required this.isListening,
    required this.onStartListening,
    required this.onStopListening,
    required this.onCopy,
    required this.onSpeak,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildActionButton(
            icon: Icons.content_copy,
            label: 'Copiar',
            onTap: onCopy,
            color: Colors.blue,
          ),
          _buildActionButton(
            icon: isListening ? Icons.stop : Icons.mic,
            label: isListening ? 'Parar' : 'Gravar',
            onTap: isListening ? onStopListening : onStartListening,
            color: isListening ? Colors.red : Colors.cyan,
            isActive: isListening,
          ),
          _buildActionButton(
            icon: Icons.volume_up,
            label: 'Ouvir',
            onTap: onSpeak,
            color: Colors.green,
          ),
          _buildActionButton(
            icon: Icons.delete_outline,
            label: 'Limpar',
            onTap: onClear,
            color: Colors.red,
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required Color color,
    bool isActive = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isActive
              ? color.withValues(alpha: 102)
              : color.withValues(alpha: 51),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive
                ? color.withValues(alpha: 204)
                : color.withValues(alpha: 128),
            width: isActive ? 2 : 1,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: color.withValues(alpha: 76),
                    blurRadius: 8,
                    spreadRadius: 2,
                  ),
                ]
              : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isActive ? Colors.white : color,
              size: isActive ? 24 : 20,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isActive ? Colors.white : color,
                fontSize: 12,
                fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
