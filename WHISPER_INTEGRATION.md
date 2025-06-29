# Integração do Whisper.cpp com Flutter - Guia Completo

## Visão Geral
Este projeto implementa um assistente virtual tipo Jarvis usando Flutter com integração planejada do whisper.cpp para reconhecimento de voz de alta qualidade.

## Estrutura Atual

### 1. Serviços Implementados

#### WhisperService (`lib/services/whisper_service.dart`)
- **Função**: Gerencia reconhecimento de voz
- **Estado Atual**: Usa `speech_to_text` como placeholder
- **Futuro**: Será integrado com whisper.cpp nativo

#### TTSService (`lib/services/tts_service.dart`)
- **Função**: Síntese de voz (Text-to-Speech)
- **Implementação**: Usa `flutter_tts`
- **Recursos**: Múltiplas vozes, controle de velocidade e pitch

#### JarvisAI (`lib/services/jarvis_ai.dart`)
- **Função**: Processamento de linguagem natural local
- **Recursos**: 
  - Reconhecimento de comandos
  - Respostas contextuais
  - Cálculos básicos
  - Informações de data/hora

### 2. Interface do Usuário

#### JarvisHomeScreen (`lib/screens/jarvis_home_screen.dart`)
- **Design**: Interface futurística com animações
- **Recursos**:
  - Visualização do núcleo do Jarvis com animações
  - Botão de voz com feedback visual
  - Histórico de comandos em tempo real
  - Indicadores de status

## Integração com Whisper.cpp

### Passos para Implementação Completa

#### 1. Preparação do Ambiente

```bash
# Clone o whisper.cpp
git clone https://github.com/ggml-org/whisper.cpp.git

# Baixe um modelo (recomendado: base.en para mobile)
cd whisper.cpp
bash ./models/download-ggml-model.sh base.en
```

#### 2. Configuração Android

**android/app/build.gradle**:
```gradle
android {
    ndkVersion "25.1.8937393"
    
    defaultConfig {
        externalNativeBuild {
            cmake {
                arguments "-DANDROID_STL=c++_shared"
                cppFlags "-std=c++11 -frtti -fexceptions"
            }
        }
        ndk {
            abiFilters 'arm64-v8a', 'armeabi-v7a'
        }
    }
    
    externalNativeBuild {
        cmake {
            path "CMakeLists.txt"
        }
    }
}
```

**android/app/CMakeLists.txt**:
```cmake
cmake_minimum_required(VERSION 3.18.1)

project(whisper_flutter)

# Whisper.cpp
add_subdirectory(../../../whisper.cpp ${CMAKE_CURRENT_BINARY_DIR}/whisper)

# Flutter
add_library(whisper_flutter SHARED
    src/main/cpp/whisper_flutter.cpp
)

target_link_libraries(whisper_flutter
    whisper
    android
    log
)
```

#### 3. Código Nativo (JNI)

**android/app/src/main/cpp/whisper_flutter.cpp**:
```cpp
#include <jni.h>
#include <android/log.h>
#include <string>
#include "whisper.h"

extern "C" {

JNIEXPORT jlong JNICALL
Java_com_yourpackage_WhisperPlugin_initWhisper(JNIEnv *env, jobject /* this */, jstring modelPath) {
    const char* model_path_cstr = env->GetStringUTFChars(modelPath, nullptr);
    
    struct whisper_context* ctx = whisper_init_from_file(model_path_cstr);
    
    env->ReleaseStringUTFChars(modelPath, model_path_cstr);
    
    return reinterpret_cast<jlong>(ctx);
}

JNIEXPORT jstring JNICALL
Java_com_yourpackage_WhisperPlugin_transcribeAudio(JNIEnv *env, jobject /* this */, 
                                                    jlong contextPtr, jfloatArray audioData) {
    auto* ctx = reinterpret_cast<struct whisper_context*>(contextPtr);
    
    if (!ctx) {
        return env->NewStringUTF("");
    }
    
    jfloat* audio_array = env->GetFloatArrayElements(audioData, nullptr);
    jsize length = env->GetArrayLength(audioData);
    
    // Configurar parâmetros do whisper
    struct whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    params.print_realtime = false;
    params.print_progress = false;
    params.print_timestamps = false;
    params.print_special = false;
    params.translate = false;
    params.language = "pt";
    params.n_threads = 4;
    params.audio_ctx = 0;
    
    // Processar áudio
    if (whisper_full(ctx, params, audio_array, length) != 0) {
        env->ReleaseFloatArrayElements(audioData, audio_array, JNI_ABORT);
        return env->NewStringUTF("");
    }
    
    // Extrair texto transcrito
    std::string result;
    const int n_segments = whisper_full_n_segments(ctx);
    for (int i = 0; i < n_segments; ++i) {
        const char* text = whisper_full_get_segment_text(ctx, i);
        result += text;
    }
    
    env->ReleaseFloatArrayElements(audioData, audio_array, JNI_ABORT);
    
    return env->NewStringUTF(result.c_str());
}

JNIEXPORT void JNICALL
Java_com_yourpackage_WhisperPlugin_freeWhisper(JNIEnv *env, jobject /* this */, jlong contextPtr) {
    auto* ctx = reinterpret_cast<struct whisper_context*>(contextPtr);
    if (ctx) {
        whisper_free(ctx);
    }
}

}
```

#### 4. Plugin Flutter

**lib/plugins/whisper_plugin.dart**:
```dart
import 'dart:ffi';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/services.dart';

class WhisperPlugin {
  static const MethodChannel _channel = MethodChannel('whisper_plugin');
  
  static Future<int?> initWhisper(String modelPath) async {
    try {
      final result = await _channel.invokeMethod('initWhisper', {'modelPath': modelPath});
      return result as int?;
    } catch (e) {
      print('Erro ao inicializar Whisper: $e');
      return null;
    }
  }
  
  static Future<String> transcribeAudio(int contextPtr, Float32List audioData) async {
    try {
      final result = await _channel.invokeMethod('transcribeAudio', {
        'contextPtr': contextPtr,
        'audioData': audioData,
      });
      return result as String;
    } catch (e) {
      print('Erro na transcrição: $e');
      return '';
    }
  }
  
  static Future<void> freeWhisper(int contextPtr) async {
    try {
      await _channel.invokeMethod('freeWhisper', {'contextPtr': contextPtr});
    } catch (e) {
      print('Erro ao liberar Whisper: $e');
    }
  }
}
```

#### 5. Atualização do WhisperService

```dart
// Atualizar lib/services/whisper_service.dart
class WhisperService extends ChangeNotifier {
  int? _whisperContext;
  
  Future<bool> initialize() async {
    // Copiar modelo para diretório local
    final modelPath = await _copyModelToLocal();
    
    // Inicializar whisper.cpp
    _whisperContext = await WhisperPlugin.initWhisper(modelPath);
    
    if (_whisperContext != null) {
      _isInitialized = true;
      notifyListeners();
      return true;
    }
    
    return false;
  }
  
  Future<String> transcribeAudio(String audioPath) async {
    if (_whisperContext == null) return '';
    
    // Converter áudio para formato esperado pelo whisper
    final audioData = await _loadAudioFile(audioPath);
    
    // Transcrever usando whisper.cpp
    return await WhisperPlugin.transcribeAudio(_whisperContext!, audioData);
  }
  
  Future<String> _copyModelToLocal() async {
    // Implementar cópia do modelo dos assets para diretório local
    // Retornar caminho do modelo
  }
  
  Future<Float32List> _loadAudioFile(String path) async {
    // Implementar carregamento e conversão de áudio
    // Whisper espera: 16kHz, mono, float32
  }
}
```

## Comandos do Jarvis Implementados

### Saudações
- "Olá", "Oi", "Hey", "Bom dia", "Boa tarde", "Boa noite"

### Informações
- "Que horas são?" → Retorna hora atual
- "Que dia é hoje?" → Retorna data atual
- "Como está o tempo?" → Comentário sobre clima

### Cálculos
- "Quanto é 5 mais 3?" → Operações matemáticas básicas
- Suporta: soma, subtração, multiplicação, divisão

### Sistema
- "Ajuda" → Lista de comandos disponíveis
- "Limpar histórico" → Remove histórico de comandos

## Próximos Passos

1. **Implementar integração completa com whisper.cpp**
   - Compilar whisper.cpp para Android
   - Criar bindings JNI
   - Testar com modelos diferentes

2. **Melhorar IA do Jarvis**
   - Adicionar mais comandos
   - Implementar contexto de conversação
   - Integrar com APIs externas (clima, notícias)

3. **Otimizações**
   - Usar modelos quantizados para performance
   - Implementar cache de modelos
   - Otimizar uso de memória

4. **Recursos Avançados**
   - Detecção de palavra-chave ("Hey Jarvis")
   - Múltiplos idiomas
   - Personalização de voz

## Execução

```bash
# Executar o projeto
flutter run

# Para debug específico do áudio
flutter run --verbose
```

O aplicativo iniciará com interface do Jarvis, permitindo interação por voz com feedback visual em tempo real.
