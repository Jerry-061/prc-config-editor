const vscode = require('vscode');

class DiagnosticProvider {
    // 核心校验逻辑
    validateLineCore(line, lineNumber, diagnostics) {
        const text = line.text;
        
        // 跳过空行和注释行
        if (!line.text.trim() || text.startsWith('//')) {
            return;
        }
        
        const columns = this.splitIgnoringJsonCommas(text);
        
        // 检查列数
        if (columns.length < 3) {
            const range = new vscode.Range(lineNumber, 0, lineNumber, line.text.length);
            diagnostics.push(
                new vscode.Diagnostic(range, '节点配置内容不完整', vscode.DiagnosticSeverity.Error)
            );
            return;
        }
        
        // 检查第三列内容
        const operation = columns[2] ? columns[2] : '';
        const operationStartIndex = this.getColumnStartIndex(text, 2);
        const operationEndIndex = operationStartIndex + (columns[2] ? columns[2].length : 0);
        const operationRange = new vscode.Range(lineNumber, operationStartIndex, lineNumber, operationEndIndex);
        
        // 检查第三列是否为空
        if (operation.length === 0) {
            diagnostics.push(
                new vscode.Diagnostic(operationRange, '节点类型不能为空', vscode.DiagnosticSeverity.Error)
            );
            return;
        } 

        // 检查第三列内容是否有效
        // 【可修改：节点类型】
        const validOperations = ['写入数据', '读取数据', '读取直到', '执行函数', '调用流程', '调用脚本',
             '写入多次', '写入验证', 'tango控制', '延时节点'];
        if (!validOperations.includes(operation)) {
            diagnostics.push(
                new vscode.Diagnostic(operationRange, 
                    `节点类型必须是: ${validOperations.join(', ')}`, 
                    vscode.DiagnosticSeverity.Error)
            );
            return;
        }

        // 【可修改：参数个数校验逻辑】
        let parNumVis = true;
        if (['写入数据', '读取数据', '读取直到', '写入验证', 'tango控制'].includes(operation)){
            if (columns.length != 5) parNumVis = false;
        } else if(operation === '写入多次') {
            if (columns.length != 6) parNumVis = false;
        } else if(operation === '执行函数') {
            if (columns.length != 4 && columns.length != 5) parNumVis = false;
        }
        else if(['调用流程', '延时节点'].includes(operation)) {
            if (columns.length != 4) parNumVis = false;
        }
        else if(operation === '调用脚本') {
            if (columns.length != 5 && columns.length != 6) parNumVis = false;
        }
        if(!parNumVis) {
            const range = new vscode.Range(lineNumber, 0, lineNumber, line.text.length);
            diagnostics.push(
                new vscode.Diagnostic(range, '参数个数错误', vscode.DiagnosticSeverity.Error)
            );
            return;
        }
        
        // 【可修改：通讯类型节点、校验逻辑】
        if (['写入数据', '读取数据', '读取直到', '写入多次', '写入验证', 'tango控制'].includes(operation))
        {
            if(operation === '写入多次') { // 写入多次节点第六列的写入次数必须是正整数
                this.verifyPositiveInteger(columns, text, 5, '写入次数', lineNumber, diagnostics);
            }

            const jsonValue = columns[4];
            const jsonStartIndex = this.getColumnStartIndex(text, 4);
            const jsonendIndex = jsonStartIndex + (columns[4] ? columns[4].length : 0);
            const jsonRange = new vscode.Range(lineNumber, jsonStartIndex, lineNumber, jsonendIndex);
            if(!jsonValue.trim()){
                diagnostics.push(
                    new vscode.Diagnostic(jsonRange, 'json数据请求不能为空', vscode.DiagnosticSeverity.Error)
                );
            } else if (!this.isValidJson(jsonValue)) {
                diagnostics.push(
                    new vscode.Diagnostic(jsonRange, 'json格式不正确', vscode.DiagnosticSeverity.Error)
                );
            }
            return;
        }

        if(operation === '延时节点') {
             // 延时节点第四列的延时时间必须是正整数
            this.verifyPositiveInteger(columns, text, 3, '延时时间', lineNumber, diagnostics);
        }
    }

    // 单行校验方法
    validateLine(document, lineNumber, collection) {
        const diagnostics = collection.get(document.uri) || [];
        
        // 移除该行原有的诊断信息
        const newDiagnostics = diagnostics.filter(diagnostic => 
            diagnostic.range.start.line !== lineNumber
        );
        
        const line = document.lineAt(lineNumber);
        
        // 使用核心校验逻辑
        this.validateLineCore(line, lineNumber, newDiagnostics);
        
        collection.set(document.uri, newDiagnostics);
    }
    
    // 完整文档校验方法
    validateDocument(document, collection) {
        const diagnostics = [];
        
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            // 使用核心校验逻辑
            this.validateLineCore(line, i, diagnostics);
        }
        
        collection.set(document.uri, diagnostics);
    }
    
    clearLineDiagnostics(uri, line, collection) {
        const diagnostics = collection.get(uri) || [];
        const newDiagnostics = diagnostics.filter(diagnostic => 
            diagnostic.range.start.line !== line
        );
        collection.set(uri, newDiagnostics);
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
    
    getColumnStartIndex(lineText, columnIndex) {
        const columns = this.splitIgnoringJsonCommas(lineText);
        let index = 0;
        for (let i = 0; i < columnIndex && i < columns.length; i++) {
            index += columns[i].length + 1; // +1 for comma
        }
        return index;
    }

    verifyPositiveInteger(columns, text, col, prefix, lineNumber, diagnostics) {
        const value = columns[col];
        const startIndex = this.getColumnStartIndex(text, col);
        const endIndex = startIndex + (value ? value.length : 0);
        const range = new vscode.Range(lineNumber, startIndex, lineNumber, endIndex);
        
        if (!value.trim()) { // 检查第 col 列是否为空
            diagnostics.push(
                new vscode.Diagnostic(range, `${prefix}不能为空`, vscode.DiagnosticSeverity.Error)
            );
        } else if (!this.isPositiveInteger(value)) { // 检查第 col 列是否为正整数
            diagnostics.push(
                new vscode.Diagnostic(range, `${prefix}必须是正整数`, vscode.DiagnosticSeverity.Error)
            );
        }
    }

    // 验证是否为正整数
    isPositiveInteger(str) {
        // 移除前后空格
        const trimmed = str.trim();
        
        // 检查是否为数字（允许前导零）
        if (!/^\d+$/.test(trimmed)) {
            return false;
        }
        
        // 转换为数字并检查是否为正数
        const num = parseInt(trimmed, 10);
        return num > 0;
    }
    
    isValidJson(str) {
        try {
            JSON.parse(str);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = DiagnosticProvider;