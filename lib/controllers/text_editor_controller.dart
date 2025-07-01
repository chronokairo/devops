import 'package:flutter/material.dart';
import '../models/writing_mode.dart';

/// Controller that manages text editing operations and statistics
class TextEditorController extends ChangeNotifier {
  final TextEditingController _textController;
  String _selectedMode = 'redacao';
  String _lastTranscription = '';

  TextEditorController() : _textController = TextEditingController() {
    _textController.addListener(_updateStats);
  }

  // Getters
  TextEditingController get textController => _textController;
  String get selectedMode => _selectedMode;
  String get text => _textController.text;
  String get lastTranscription => _lastTranscription;

  int get wordCount =>
      text.trim().isEmpty ? 0 : text.trim().split(RegExp(r'\s+')).length;

  int get charCount => text.length;

  int get lineCount => charCount > 0 ? text.split('\n').length : 0;

  WritingMode? get currentMode => WritingMode.getByKey(_selectedMode);

  // Methods
  void setSelectedMode(String mode) {
    _selectedMode = mode;
    notifyListeners();
  }

  void insertTextAtCursor(String newText) {
    debugPrint('Inserting text at cursor: "$newText"');

    if (newText.isEmpty || newText == _lastTranscription) {
      debugPrint('Text is empty or same as last transcription, skipping...');
      return;
    }

    _lastTranscription = newText;
    final text = _textController.text;
    final selection = _textController.selection;
    String formattedText = newText;

    // Ensure selection is valid
    final validSelection = TextSelection(
      baseOffset: selection.baseOffset >= 0
          ? selection.baseOffset
          : text.length,
      extentOffset: selection.extentOffset >= 0
          ? selection.extentOffset
          : text.length,
    );

    // Auto-formatting based on selected mode
    final mode = currentMode;
    if (mode?.hasFormatting == true && text.isEmpty) {
      formattedText = '\t$newText';
    }

    // Capitalize first letter if necessary
    if (text.isEmpty ||
        text.endsWith('.') ||
        text.endsWith('!') ||
        text.endsWith('?')) {
      if (formattedText.isNotEmpty) {
        formattedText =
            formattedText[0].toUpperCase() +
            (formattedText.length > 1 ? formattedText.substring(1) : '');
      }
    }

    // Add space if needed
    final needsSpace =
        validSelection.start > 0 &&
        !text
            .substring(validSelection.start - 1, validSelection.start)
            .contains(' ');

    final newTextValue =
        text.substring(0, validSelection.start) +
        (needsSpace ? ' ' : '') +
        formattedText +
        text.substring(validSelection.end);

    final newCursorPosition =
        validSelection.start + formattedText.length + (needsSpace ? 1 : 0);

    _textController.value = TextEditingValue(
      text: newTextValue,
      selection: TextSelection.collapsed(offset: newCursorPosition),
    );
  }

  void insertPunctuation(String punctuation) {
    final text = _textController.text;
    final selection = _textController.selection;
    final newText =
        text.substring(0, selection.start) +
        punctuation +
        text.substring(selection.end);

    _textController.value = TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(
        offset: selection.start + punctuation.length,
      ),
    );
  }

  void clearText() {
    _textController.clear();
    _lastTranscription = '';
  }

  void insertTemplate() {
    final mode = currentMode;
    if (mode != null) {
      _textController.text = mode.template;
      _textController.selection = const TextSelection.collapsed(offset: 0);
    }
  }

  void _updateStats() {
    notifyListeners();
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }
}
