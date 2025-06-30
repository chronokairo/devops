import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/writing_mode.dart';

/// Widget for selecting different writing modes
class WritingModeSelector extends StatelessWidget {
  final String selectedMode;
  final ValueChanged<String> onModeChanged;

  const WritingModeSelector({
    super.key,
    required this.selectedMode,
    required this.onModeChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.grey[900],
        borderRadius: BorderRadius.circular(25),
        border: Border.all(color: Colors.cyan.withOpacity(0.3)),
      ),
      child: Row(
        children: WritingMode.modes.map((mode) {
          final isSelected = selectedMode == mode.key;
          return Expanded(
            child: GestureDetector(
              onTap: () {
                onModeChanged(mode.key);
                HapticFeedback.selectionClick();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                  vertical: 8,
                  horizontal: 12,
                ),
                decoration: BoxDecoration(
                  color: isSelected
                      ? Colors.cyan.withOpacity(0.2)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  border: isSelected ? Border.all(color: Colors.cyan) : null,
                ),
                child: Text(
                  mode.displayName,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: isSelected ? Colors.cyan : Colors.grey,
                    fontSize: 11,
                    fontWeight: isSelected
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
