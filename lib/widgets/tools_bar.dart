import 'package:flutter/material.dart';

/// Widget that displays tools like tips and templates
class ToolsBar extends StatelessWidget {
  final VoidCallback onShowTips;
  final VoidCallback onInsertTemplate;

  const ToolsBar({
    super.key,
    required this.onShowTips,
    required this.onInsertTemplate,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildToolButton(
            icon: Icons.lightbulb_outline,
            label: 'Dicas',
            onTap: onShowTips,
            color: Colors.orange,
          ),
          _buildToolButton(
            icon: Icons.description_outlined,
            label: 'Modelo',
            onTap: onInsertTemplate,
            color: Colors.purple,
          ),
        ],
      ),
    );
  }

  Widget _buildToolButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required Color color,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.5)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
