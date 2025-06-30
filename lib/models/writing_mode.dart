/// Model class to represent different writing modes and their configurations
class WritingMode {
  final String key;
  final String displayName;
  final String placeholder;
  final List<String> tips;
  final bool hasFormatting;

  const WritingMode({
    required this.key,
    required this.displayName,
    required this.placeholder,
    required this.tips,
    required this.hasFormatting,
  });

  /// Predefined writing modes
  static const List<WritingMode> modes = [
    WritingMode(
      key: 'redacao',
      displayName: 'Redação Dissertativa',
      placeholder: 'Pressione gravar e dite sua redação dissertativa...',
      tips: [
        'Introdução: Apresente o tema e sua tese',
        'Desenvolvimento: Argumente com exemplos',
        'Conclusão: Retome a tese e proponha soluções',
      ],
      hasFormatting: true,
    ),
    WritingMode(
      key: 'carta',
      displayName: 'Carta Pessoal',
      placeholder: 'Pressione gravar e dite sua carta pessoal...',
      tips: [
        'Cabeçalho: Local e data',
        'Saudação: Caro(a) [nome]',
        'Corpo: Desenvolva o assunto',
        'Despedida: Atenciosamente, [seu nome]',
      ],
      hasFormatting: false,
    ),
    WritingMode(
      key: 'artigo',
      displayName: 'Artigo de Opinião',
      placeholder: 'Pressione gravar e dite seu artigo de opinião...',
      tips: [
        'Título chamativo e claro',
        'Lead: Primeiro parágrafo resumindo o tema',
        'Argumentação fundamentada',
        'Conclusão com call-to-action',
      ],
      hasFormatting: true,
    ),
    WritingMode(
      key: 'relatorio',
      displayName: 'Relatório Técnico',
      placeholder: 'Pressione gravar e dite seu relatório técnico...',
      tips: [
        'Objetivo: Defina o propósito',
        'Metodologia: Como foi feito',
        'Resultados: O que foi encontrado',
        'Conclusões: Interpretação dos dados',
      ],
      hasFormatting: true,
    ),
  ];

  /// Get mode by key
  static WritingMode? getByKey(String key) {
    try {
      return modes.firstWhere((mode) => mode.key == key);
    } catch (e) {
      return null;
    }
  }

  /// Get template text for the mode
  String get template {
    switch (key) {
      case 'redacao':
        return '\t[Introdução - Apresente o tema e sua tese]\n\n'
            '\t[Desenvolvimento 1 - Primeiro argumento]\n\n'
            '\t[Desenvolvimento 2 - Segundo argumento]\n\n'
            '\t[Conclusão - Retome a tese e proponha soluções]';
      case 'carta':
        return '[Local], [Data]\n\n'
            'Caro(a) [Nome],\n\n'
            '[Corpo da carta]\n\n'
            'Atenciosamente,\n'
            '[Seu nome]';
      case 'artigo':
        return '[Título do Artigo]\n\n'
            '[Lead - Primeiro parágrafo resumindo o tema]\n\n'
            '[Desenvolvimento - Argumentação]\n\n'
            '[Conclusão com call-to-action]';
      case 'relatorio':
        return 'RELATÓRIO - [Título]\n\n'
            '1. OBJETIVO\n[Defina o propósito]\n\n'
            '2. METODOLOGIA\n[Como foi feito]\n\n'
            '3. RESULTADOS\n[O que foi encontrado]\n\n'
            '4. CONCLUSÕES\n[Interpretação dos dados]';
      default:
        return '';
    }
  }
}
