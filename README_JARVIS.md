# Adicionar às permissões do Android - android/app/src/main/AndroidManifest.xml

Adicione estas permissões no arquivo AndroidManifest.xml:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

# Para integração com whisper.cpp no futuro:

1. Adicione o whisper.cpp como dependência nativa
2. Configure build.gradle para compilar o código C++
3. Crie bindings JNI para Android
4. Implemente bridge Dart para chamadas nativas

# Estrutura do projeto:

```
lib/
├── main.dart                     # Ponto de entrada do app
├── models/
│   └── voice_command.dart        # Modelo de dados para comandos
├── services/
│   ├── whisper_service.dart      # Serviço de reconhecimento de voz
│   ├── tts_service.dart         # Serviço de síntese de voz
│   └── jarvis_ai.dart           # IA do Jarvis
└── screens/
    └── jarvis_home_screen.dart   # Tela principal do Jarvis
```
