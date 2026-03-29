const vscode = require('vscode');
const CompletionProvider = require('./providers/completionProvider');
const DiagnosticProvider = require('./providers/diagnosticProvider');
const SemanticTokensProvider = require('./providers/semanticTokensProvider');

let diagnosticProvider;
let diagnosticCollection;
let lastActivePosition = null;

function activate(context) {
    // 注册自动补全提供者
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        'prc',
        new CompletionProvider(),
        ','
    );
    
    // 注册语法校验提供者
    diagnosticProvider = new DiagnosticProvider();
    diagnosticCollection = vscode.languages.createDiagnosticCollection('prc');

    // 激活时校验所有已打开的prc文件
    vscode.workspace.textDocuments.forEach(document => {
        if (document.languageId === 'prc') {
            diagnosticProvider.validateDocument(document, diagnosticCollection);
        }
    });
    
    // 监听光标位置变化，只在光标离开行时进行校验
    vscode.window.onDidChangeTextEditorSelection(event => {
        if (event.textEditor.document.languageId === 'prc') {
            const currentPosition = event.selections[0].active;

            // 只有当光标移动到不同行时才进行完整校验
            if (lastActivePosition && lastActivePosition.line !== currentPosition.line) {
                diagnosticProvider.validateLine(event.textEditor.document, lastActivePosition.line, diagnosticCollection);
            }
            
            // 清除当前行的错误提示
            diagnosticProvider.clearLineDiagnostics(event.textEditor.document.uri, currentPosition.line, diagnosticCollection);
            
            lastActivePosition = currentPosition;
        }
    });
    
    // 监听文档保存事件进行完整校验
    vscode.workspace.onDidSaveTextDocument(document => {
        if (document.languageId === 'prc') {
            diagnosticProvider.validateDocument(document, diagnosticCollection);
        }
    });

    // 打开文件时进行完整校验
    vscode.workspace.onDidOpenTextDocument(document => {
        if (document.languageId === 'prc') {
            diagnosticProvider.validateDocument(document, diagnosticCollection);
        }
    });

    // // 文档变为可见时校验（切换到标签页时）
    // vscode.window.onDidChangeActiveTextEditor(editor => {
    //     if (editor && editor.document.languageId === 'prc') {
    //         console.log('切换到prc文档，进行校验');
    //         setTimeout(() => {
    //             diagnosticProvider.validateDocument(editor.document, diagnosticCollection);
    //         }, 50);
    //     }
    // });
    
    // 注册语义令牌提供者（语法高亮）
    const semanticTokensProvider = new SemanticTokensProvider();
    const semanticTokens = vscode.languages.registerDocumentSemanticTokensProvider(
        'prc',
        semanticTokensProvider,
        semanticTokensProvider.getLegend()
    );
    
    // 新建文件时自动插入文件头
    vscode.workspace.onDidOpenTextDocument(document => {
        if (document.languageId === 'prc' && 
            document.lineCount === 1 && 
            document.getText() === '' &&
            vscode.workspace.getConfiguration('prcEditor').get('autoInsertHeader')) {
            
            // 【可修改：文件头内容】
            const headerText = `//说明：以"//"开头的行为注释内容；参数与参数之间以英文逗号","做为分隔符;需要作为API函数输出参数的节点名称不可重复
//节点名称,节点说明：通过软件已支持的通讯协议写入数据,写入数据,通讯对象名称,要写入的数据json格式请求
//节点名称,节点说明：通过软件已支持的通讯协议读取数据,读取数据,通讯对象名称,要读取的数据json格式请求
//节点名称,节点说明：读取数据直到数据为指定数据,读取直到,通讯对象名称,目标json数据（与要写入的数据格式相同）
//节点名称,节点说明：执行函数节点，通过函数别名字符串调用函数,执行函数,函数别名字符串[,可选参数]
//节点名称,节点说明：调用子流程,调用流程,在FilePath.csv文件中配置的子流程文件路径别名
//节点名称,节点说明：调用在Python中编写好的Api函数,调用脚本,模块名称（不带扩展名的.py文件）,函数名称[,可选参数]
//节点名称,节点说明：连续多次写入数据,写入多次,通讯对象名称,要写入的数据json格式请求,写入次数
//节点名称,节点说明：写入数据后立即读取该地址的数据，如果写入未成功则继续写入，直到写入成功,写入验证,通讯对象名称,要写入的数据json格式请求
//节点名称,节点说明：调用tango服务器的命令、向tango服务器属性写入数据、读取tango服务器属性数据,tango控制,tango对象名称,json格式请求
//节点名称,节点说明：等待一段时间,延时节点,延时时间（单位：毫秒）
`;
            const edit = new vscode.WorkspaceEdit();
            edit.insert(document.uri, new vscode.Position(0, 0), headerText);
            vscode.workspace.applyEdit(edit);
        }
    });
    
    context.subscriptions.push(completionProvider, semanticTokens, diagnosticCollection);
}

function deactivate() {}

module.exports = { activate, deactivate };