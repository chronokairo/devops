import 'package:flutter/material.dart';

/// Animated wave bars that show when voice recording is active
class VoiceWaveAnimation extends StatelessWidget {
  final AnimationController controller;
  final int barCount;
  final Color color;

  const VoiceWaveAnimation({
    super.key,
    required this.controller,
    this.barCount = 5,
    this.color = Colors.red,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(barCount, (index) {
              final animationValue = index.isEven
                  ? controller.value
                  : 1 - controller.value;

              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 2),
                width: 4,
                height: 20 + (20 * (0.5 + 0.5 * animationValue)),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(2),
                ),
              );
            }),
          ),
        );
      },
    );
  }
}
