const vscode = require('vscode');

class CompletionProvider {
    provideCompletionItems(document, position, token, context) {
        const lineText = document.lineAt(position.line).text;
        const textUntilPosition = lineText.substring(0, position.character);
        
        // 使用改进的逗号计数方法，忽略JSON中的逗号
        const commaCount = this.countValidCommas(textUntilPosition);
        
        const completions = [];
        
        // 第二个逗号后提供节点类型补全
        if (commaCount === 2) {
            // 【可修改：节点类型】
            const operations = [
                { label: '写入数据', sortOrder: 'a' },
                { label: '读取数据', sortOrder: 'b' },
                { label: '读取直到', sortOrder: 'c' },
                { label: '执行函数', sortOrder: 'd' },
                { label: '调用流程', sortOrder: 'e' },
                { label: '调用脚本', sortOrder: 'f' },
                { label: '写入多次', sortOrder: 'g' },
                { label: '写入验证', sortOrder: 'h' },
                { label: 'tango控制', sortOrder: 'i' },
                { label: '延时节点', sortOrder: 'j' }
            ];
            
            operations.forEach(op => {
                const item = new vscode.CompletionItem(op.label, vscode.CompletionItemKind.Keyword);
                item.insertText = op.label;
                item.sortText = op.sortOrder; // 使用字母排序确保固定顺序
                completions.push(item);
            });
            
            // 模糊匹配：如果已经输入了部分文字
            const currentWord = this.getCurrentWord(textUntilPosition);
            if (currentWord) {
                return completions.filter(item => 
                    item.label.includes(currentWord)
                );
            }
        }

        // 第四个逗号后提供JSON花括号补全
        if (commaCount === 4) {
            const thirdColumn = this.getColumnValue(lineText, 2);

            // 【可修改：通讯类型节点】
            if (['写入数据', '读取数据', '读取直到', '写入多次', '写入验证', 'tango控制'].includes(thirdColumn)) {
                const item = new vscode.CompletionItem('{}', vscode.CompletionItemKind.Snippet);
                item.insertText = new vscode.SnippetString('{$0}');
                item.documentation = '插入JSON对象';
                completions.push(item);
            }
        }
        
        return completions;
    }

    // 改进的逗号计数方法，忽略JSON字符串中的逗号
    countValidCommas(text) {
        let count = 0;
        for (let i = 0; i < text.length; i++) {
            // 只有逗号后不紧跟双引号或逗号为最后一个字符时才计数
            if (text[i] === ',' && (i + 1 === text.length || text[i + 1] !== '"')) {
                count++;
            }
        }
        return count;
    }
    
    getCurrentWord(text) {
        const words = text.split(',');
        return words[words.length - 1];
    }
    
    getColumnValue(lineText, columnIndex) {
        const columns = this.splitIgnoringJsonCommas(lineText);
        return columns[columnIndex] ? columns[columnIndex] : '';
    }
    
    // 改进的字符串分割方法，忽略JSON中的逗号
    splitIgnoringJsonCommas(line) {
        const result = [];
        let current = '';
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (line[i] === ',' && (i + 1 === line.length || line[i + 1] !== '"')) {
                result.push(current);
                current = '';
            } else{
                current += char;
            }
        }
        result.push(current);
        return result;
    }
}

module.exports = CompletionProvider;