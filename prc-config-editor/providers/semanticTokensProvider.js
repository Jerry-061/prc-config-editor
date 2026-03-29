const vscode = require('vscode');

class SemanticTokensProvider {  
    constructor() {
        // 定义令牌类型数组
        this.tokenTypes = [
            // 'comment',       //0
            // 'namespace',     //1
            // 'class',         //2
            // 'enum',          //3
            // 'interface',     //4
            // 'struct',        //5
            // 'typeParameter', //6
            // 'type',          //7
            // 'parameter',     //8
            // 'variable',      //9
            // 'property',      //10
            // 'enumMember',    //11
            // 'decorator',     //12
            // 'event',         //13
            // 'function',      //14
            // 'method',        //15
            // 'macro',         //16
            // 'label',         //17
            // 'string',        //18
            // 'keyword',       //19
            // 'number',        //20
            // 'regexp',        //21
            // 'operator'       //22

            'comment',      // 0: 注释
            'variable',     // 1: 节点名称
            'type',         // 2: 节点说明
            'keyword',      // 3: 节点类型
            'string',       // 4: 通讯对象名称
            'number',       // 5: JSON数据
            'enumMember',   // 6: 函数别名
            'method',       // 7: 函数参数,写入次数,延时时间
            'macro',        // 8: 子流程文件路径别名,模块名称
            'operator'      // 9: 其他
        ];
        
        // 【可修改：每种节点类型对应的各列颜色索引】
        // 定义颜色映射表 - 每种节点类型对应的各列颜色索引
        this.colorMapping = {
            //'测试': [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22],
            '写入数据': [1, 2, 3, 4, 5],    // [节点名称,节点说明,节点类型,通讯对象,JSON数据]
            '读取数据': [1, 2, 3, 4, 5],
            '读取直到': [1, 2, 3, 4, 5],
            '执行函数': [1, 2, 3, 6, 7],    // [节点名称,节点说明,节点类型,函数别名,函数参数]
            '调用流程': [1, 2, 3, 8],       // [节点名称,节点说明,节点类型,子流程文件路径别名]
            '调用脚本': [1, 2, 3, 8, 6, 7], // [节点名称,节点说明,节点类型,模块名称,函数名称,函数参数]
            '写入多次': [1, 2, 3, 4, 5, 7], // [节点名称,节点说明,节点类型,通讯对象,JSON数据,写入次数]
            '写入验证': [1, 2, 3, 4, 5],
            'tango控制': [1, 2, 3, 4, 5],   // [节点名称,节点说明,节点类型,对象名称,JSON数据]
            '延时节点': [1, 2, 3, 7]        // [节点名称,节点说明,节点类型,延时时间]
        };
        
        // 默认颜色索引（当没有匹配或超出范围时使用）
        this.defaultColorIndex = this.tokenTypes.length - 1; // operator
    }
    
    getLegend() {
        return new vscode.SemanticTokensLegend(this.tokenTypes, []);
    }
    
    // 获取颜色索引的主函数
    getColorIndex(thirdColumn, columnIndex) {
        // 检查映射表中是否存在该节点类型
        if (this.colorMapping.hasOwnProperty(thirdColumn)) {
            const colorIndices = this.colorMapping[thirdColumn];
            
            // 检查列索引是否在映射表范围内
            if (columnIndex >= 0 && columnIndex < colorIndices.length) {
                return colorIndices[columnIndex];
            } else {
                // 列索引超出映射表范围，返回默认颜色
                return this.defaultColorIndex;
            }
        } else {
            // 没有找到对应的节点类型映射
            if (columnIndex === 0) {
                return 1; // 第一列默认颜色
            } else if (columnIndex === 1) {
                return 2; // 第二列默认颜色
            } else {
                return this.defaultColorIndex; // 其他列默认颜色
            }
        }
    }
    
    provideDocumentSemanticTokens(document, token) {
        const builder = new vscode.SemanticTokensBuilder(this.getLegend());
        
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;
            
            if (text.startsWith('//')) {
                // 注释行 - 使用comment令牌
                builder.push(line.range, this.getToken(0));
            } else if (text.trim()) {
                const columns = this.splitIgnoringJsonCommas(text);
                
                // 获取第三列的值（节点类型）
                const thirdColumn = columns[2] ? columns[2] : '';
                
                // 为每一列分别应用不同的令牌类型
                let currentPos = 0;
                columns.forEach((col, columnIndex) => {
                    const colText = col.trim();
                    if (colText) {
                        const start = new vscode.Position(i, currentPos);
                        const end = new vscode.Position(i, currentPos + col.length);
                        const range = new vscode.Range(start, end);
                        
                        // 使用映射表获取颜色索引
                        const tokenIndex = this.getColorIndex(thirdColumn, columnIndex);
                        
                        builder.push(range, this.getToken(tokenIndex));
                    }
                    currentPos += col.length + 1; // +1 for comma
                });
            }
        }
        
        return builder.build();
    }
    
    getToken(index) {
        if (index >= 0 && index <= this.defaultColorIndex) {
            return this.tokenTypes[index];
        }
        return this.tokenTypes[this.defaultColorIndex];
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

module.exports = SemanticTokensProvider;