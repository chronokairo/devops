# Jarvis AI Assistant

Um assistente virtual inteligente criado em Flutter, inspirado no Jarvis do Homem de Ferro, com integração planejada do whisper.cpp para reconhecimento de voz de alta qualidade.

## 🚀 Características

### ✨ Interface Futurística
- Design dark com efeitos neon em cyan
- Animações fluídas e feedback visual
- Interface tipo "olho do Jarvis" com pulsação
- Efeitos de partículas e ondas de voz

### 🎙️ Reconhecimento de Voz
- Baseado em `speech_to_text` (placeholder para whisper.cpp)
- Suporte a português brasileiro
- Feedback visual durante gravação
- Transcrição em tempo real

### 🗣️ Síntese de Voz
- Text-to-speech com `flutter_tts`
- Voz personalizada em português
- Controle de velocidade e tom
- Respostas naturais e contextuais

### 🧠 IA Local
- Processamento de linguagem natural sem internet
- Comandos inteligentes e respostas contextuais
- Cálculos matemáticos básicos
- Informações de sistema (hora, data)

## 📱 Comandos Disponíveis

### Saudações
- "Olá", "Oi", "Hey", "Bom dia"
- "Boa tarde", "Boa noite"

### Informações
- "Que horas são?" / "Que horas"
- "Que dia é hoje?" / "Data"
- "Como está o tempo?"

### Cálculos
- "Quanto é 5 mais 3?"
- "Multiplica 7 por 8"
- "Divida 20 por 4"
- "Subtrai 15 de 30"

### Sistema
- "Ajuda" - Lista comandos disponíveis
- "Limpar histórico" - Remove histórico

### Interação
- "Seu nome" / "Quem é você"
- Perguntas gerais recebem respostas contextuais

## 🛠️ Tecnologias

- **Flutter 3.8+** - Framework principal
- **speech_to_text** - Reconhecimento de voz atual
- **flutter_tts** - Síntese de voz
- **provider** - Gerenciamento de estado
- **animated_text_kit** - Animações de texto
- **flutter_animate** - Animações avançadas

## 📦 Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/riluvi.git
cd riluvi
```

2. **Instale as dependências**
```bash
flutter pub get
```

3. **Configure as permissões**
- Android: Já configurado no `AndroidManifest.xml`
- iOS: Adicione no `Info.plist`:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Este app precisa do microfone para reconhecimento de voz</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>Este app precisa do reconhecimento de voz para comandos</string>
```

4. **Execute o projeto**
```bash
flutter run
```

## 🎯 Roadmap - Integração Whisper.cpp

### Fase 1: Configuração Base ✅
- [x] Interface do usuário completa
- [x] Serviços de TTS e STT básicos
- [x] IA local funcional
- [x] Sistema de comandos

### Fase 2: Integração Whisper.cpp 🚧
- [ ] Compilar whisper.cpp para Android/iOS
- [ ] Criar bindings JNI/FFI
- [ ] Implementar carregamento de modelos
- [ ] Otimizar performance para mobile

### Fase 3: Recursos Avançados 📋
- [ ] Detecção de palavra-chave ("Hey Jarvis")
- [ ] Múltiplos idiomas
- [ ] Modelos quantizados
- [ ] Cache inteligente de modelos

### Fase 4: IA Avançada 🔮
- [ ] Integração com APIs externas
- [ ] Contexto de conversação
- [ ] Personalização de respostas
- [ ] Comandos personalizados

## 🏗️ Estrutura do Projeto

```
lib/
├── main.dart                     # Ponto de entrada
├── models/
│   └── voice_command.dart        # Modelo de dados
├── services/
│   ├── whisper_service.dart      # Reconhecimento de voz
│   ├── tts_service.dart         # Síntese de voz
│   └── jarvis_ai.dart           # IA do Jarvis
└── screens/
    └── jarvis_home_screen.dart   # Interface principal
```

## 🔧 Configuração para Whisper.cpp

Consulte o arquivo `WHISPER_INTEGRATION.md` para instruções detalhadas sobre como integrar o whisper.cpp nativamente.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) - Inspiração para reconhecimento de voz
- [Flutter](https://flutter.dev) - Framework fantástico
- Marvel/Iron Man - Inspiração para o design do Jarvis

---

**"Sometimes you gotta run before you can walk."** - Tony Stark

