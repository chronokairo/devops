import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:animated_text_kit/animated_text_kit.dart';
import '../services/whisper_service.dart';
import '../services/tts_service.dart';
import '../controllers/text_editor_controller.dart';
import '../widgets/writing_mode_selector.dart';
import '../widgets/tools_bar.dart';
import '../widgets/action_buttons_widget.dart';
import '../widgets/punctuation_bar.dart';
import '../widgets/text_stats_bar.dart';
import '../widgets/voice_wave_animation.dart';

class ModoVozParaTextoScreen extends StatefulWidget {
  const ModoVozParaTextoScreen({super.key});

  @override
  State<ModoVozParaTextoScreen> createState() => _ModoVozParaTextoScreenState();
}

class _ModoVozParaTextoScreenState extends State<ModoVozParaTextoScreen>
    with TickerProviderStateMixin {
  // Animation Controllers
  late AnimationController _pulseController;
  late AnimationController _voiceWaveController;

  // Controllers
  late TextEditorController _textEditorController;
  late ScrollController _scrollController;

  // State
  bool _isInitialized = false;
  bool _isAutoScrollEnabled = true;

  // Voice recognition
  late VoidCallback _whisperListener;
  String _previousLastWords = '';
  Timer? _monitorTimer;
  late WhisperService _whisperService;

  @override
  void initState() {
    super.initState();
    _whisperService = Provider.of<WhisperService>(context, listen: false);
    _initializeControllers();
    _initializeServices();
  }

  void _initializeControllers() {
    _textEditorController = TextEditorController();
    _scrollController = ScrollController();

    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();

    _voiceWaveController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _whisperListener = () {};
  }

  Future<void> _initializeServices() async {
    final ttsService = Provider.of<TTSService>(context, listen: false);

    await _whisperService.initialize();
    await ttsService.initialize();

    setState(() {
      _isInitialized = true;
    });

    // Removi a mensagem de boas-vindas para deixar mais limpo
  }

  Future<void> _startListening() async {
    debugPrint('_startListening called');

    final ttsService = Provider.of<TTSService>(context, listen: false);

    if (ttsService.isSpeaking) {
      await ttsService.stop();
    }

    _whisperService.removeListener(_whisperListener);
    _previousLastWords = _whisperService.lastWords;

    _whisperListener = () {
      debugPrint(
        'WhisperListener triggered - isListening: ${_whisperService.isListening}, partialWords: "${_whisperService.partialWords}", lastWords: "${_whisperService.lastWords}"',
      );

      // Simplificar a lógica: inserir sempre que lastWords mudar e não for vazio
      if (_whisperService.lastWords.isNotEmpty &&
          _whisperService.lastWords != _previousLastWords) {
        debugPrint('Inserting text: "${_whisperService.lastWords}"');
        _textEditorController.insertTextAtCursor(_whisperService.lastWords);
        _previousLastWords = _whisperService.lastWords;

        // Aguarda um frame antes de limpar para garantir que a inserção foi processada
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _whisperService.clearLastWords();
        });

        _autoScroll();
      }
    };

    _whisperService.addListener(_whisperListener);
    // Timer automático removido - controle manual pelo usuário

    try {
      await _whisperService.startListening();
      _voiceWaveController.repeat();
      HapticFeedback.lightImpact();
      debugPrint('Started listening successfully');
    } catch (e) {
      debugPrint('Error starting listening: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao iniciar gravação: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _stopListening() async {
    debugPrint('_stopListening called');
    await _whisperService.stopListening();
    _voiceWaveController.stop();
    HapticFeedback.lightImpact();

    _whisperService.removeListener(_whisperListener);
    _monitorTimer?.cancel();
    _monitorTimer = null;
  }

  void _autoScroll() {
    if (_isAutoScrollEnabled) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  void _showWritingTips() {
    final mode = _textEditorController.currentMode;
    if (mode == null) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.grey[900],
        title: Text(
          'Dicas para ${mode.displayName}',
          style: const TextStyle(color: Colors.cyan),
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Estrutura recomendada:',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              ...mode.tips.map<Widget>(
                (tip) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• ', style: TextStyle(color: Colors.cyan)),
                      Expanded(
                        child: Text(
                          tip,
                          style: const TextStyle(color: Colors.white70),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Entendi', style: TextStyle(color: Colors.cyan)),
          ),
        ],
      ),
    );
  }

  void _insertTemplate() {
    if (_textEditorController.text.isEmpty) {
      _textEditorController.insertTemplate();
    } else {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: Colors.grey[900],
          title: const Text(
            'Inserir Modelo',
            style: TextStyle(color: Colors.cyan),
          ),
          content: const Text(
            'Já existe texto no editor. Deseja substituir pelo modelo?',
            style: TextStyle(color: Colors.white),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text(
                'Cancelar',
                style: TextStyle(color: Colors.grey),
              ),
            ),
            TextButton(
              onPressed: () {
                _textEditorController.insertTemplate();
                Navigator.pop(context);
              },
              child: const Text(
                'Substituir',
                style: TextStyle(color: Colors.cyan),
              ),
            ),
          ],
        ),
      );
    }
  }

  void _clearText() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.grey[900],
        title: const Text('Limpar Texto', style: TextStyle(color: Colors.cyan)),
        content: const Text(
          'Tem certeza que deseja apagar todo o texto?',
          style: TextStyle(color: Colors.white),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () {
              _textEditorController.clearText();
              Navigator.pop(context);
              HapticFeedback.mediumImpact();
            },
            child: const Text('Limpar', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _copyToClipboard() {
    if (_textEditorController.text.isNotEmpty) {
      Clipboard.setData(ClipboardData(text: _textEditorController.text));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Texto copiado para a área de transferência'),
          backgroundColor: Colors.cyan,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
      HapticFeedback.selectionClick();
    }
  }

  Future<void> _speakText() async {
    final ttsService = Provider.of<TTSService>(context, listen: false);
    if (_textEditorController.text.isNotEmpty) {
      if (ttsService.isSpeaking) {
        await ttsService.stop();
      } else {
        await ttsService.speak(_textEditorController.text);
      }
    } else {
      await ttsService.speak("Não há texto para ser lido.");
    }
  }

  Widget _buildTextField() {
    return Consumer<WhisperService>(
      builder: (context, whisperService, child) {
        return Expanded(
          child: Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[900]?.withAlpha(179), // 0.7 * 255 ≈ 179
              borderRadius: BorderRadius.circular(15),
              border: Border.all(
                color: whisperService.isListening
                    ? Colors.red.withAlpha(128)
                    : Colors.cyan.withAlpha(77),
              ),
            ),
            child: TextField(
              controller: _textEditorController.textController,
              scrollController: _scrollController,
              maxLines: null,
              expands: true,
              textAlignVertical: TextAlignVertical.top,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                height: 1.5,
              ),
              decoration: InputDecoration(
                hintText:
                    _textEditorController.currentMode?.placeholder ??
                    'Pressione gravar e comece a ditar...',
                hintStyle: TextStyle(color: Colors.grey[500], fontSize: 16),
                border: InputBorder.none,
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildVoiceStatus() {
    return Consumer<WhisperService>(
      builder: (context, whisperService, child) {
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (whisperService.isListening)
                VoiceWaveAnimation(controller: _voiceWaveController),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: AnimatedTextKit(
          animatedTexts: [
            TypewriterAnimatedText(
              'Módulo de Redação',
              textStyle: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.cyan,
              ),
              speed: const Duration(milliseconds: 100),
            ),
          ],
          totalRepeatCount: 1,
        ),
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.cyan),
        actions: [
          IconButton(
            icon: Icon(
              _isAutoScrollEnabled
                  ? Icons.vertical_align_bottom
                  : Icons.vertical_align_center,
              color: _isAutoScrollEnabled ? Colors.cyan : Colors.grey,
            ),
            onPressed: () {
              setState(() => _isAutoScrollEnabled = !_isAutoScrollEnabled);
              HapticFeedback.selectionClick();
            },
            tooltip: 'Auto-scroll',
          ),
        ],
      ),
      body: !_isInitialized
          ? const Center(child: CircularProgressIndicator(color: Colors.cyan))
          : ChangeNotifierProvider.value(
              value: _textEditorController,
              child: Consumer<TextEditorController>(
                builder: (context, controller, child) {
                  return Column(
                    children: [
                      WritingModeSelector(
                        selectedMode: controller.selectedMode,
                        onModeChanged: controller.setSelectedMode,
                      ),
                      ToolsBar(
                        onShowTips: _showWritingTips,
                        onInsertTemplate: _insertTemplate,
                      ),
                      _buildTextField(),
                      PunctuationBar(
                        onPunctuationSelected: controller.insertPunctuation,
                      ),
                      _buildVoiceStatus(),
                      Consumer<WhisperService>(
                        builder: (context, whisperService, child) {
                          return ActionButtonsWidget(
                            isListening: whisperService.isListening,
                            onStartListening: _startListening,
                            onStopListening: _stopListening,
                            onCopy: _copyToClipboard,
                            onSpeak: _speakText,
                            onClear: _clearText,
                          );
                        },
                      ),
                      TextStatsBar(
                        wordCount: controller.wordCount,
                        charCount: controller.charCount,
                        lineCount: controller.lineCount,
                      ),
                    ],
                  );
                },
              ),
            ),
    );
  }

  @override
  void dispose() {
    _whisperService.removeListener(_whisperListener);
    _monitorTimer?.cancel();
    _pulseController.dispose();
    _voiceWaveController.dispose();
    _textEditorController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}
