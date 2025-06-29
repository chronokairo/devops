import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/whisper_service.dart';
import 'services/tts_service.dart';
import 'services/jarvis_ai.dart';
import 'screens/jarvis_home_screen.dart';

void main() {
  runApp(const JarvisApp());
}

class JarvisApp extends StatelessWidget {
  const JarvisApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => WhisperService()),
        ChangeNotifierProvider(create: (_) => TTSService()),
        ChangeNotifierProvider(create: (_) => JarvisAI()),
      ],
      child: MaterialApp(
        title: 'Jarvis AI Assistant',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: Colors.cyan,
            brightness: Brightness.dark,
          ),
          useMaterial3: true,
          fontFamily: 'Roboto',
          scaffoldBackgroundColor: Colors.black,
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.black,
            foregroundColor: Colors.cyan,
          ),
        ),
        home: const JarvisHomeScreen(),
      ),
    );
  }
}
