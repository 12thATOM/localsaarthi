// chatbot_widget.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var ChatbotWidget = /** @class */ (function () {
    function ChatbotWidget() {
        this.apiUrl = "http://localhost:8000/chat";
        this.chatHistory = [];
        this.injectStyles();
        this.createWidget();
        this.attachEventListeners();
    }
    ChatbotWidget.prototype.injectStyles = function () {
        var style = document.createElement('style');
        style.innerHTML = "\n            #chat-widget-container { position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: 'Inter', 'Roboto', sans-serif; }\n            #chat-widget-btn { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); display: flex; align-items: center; justify-content: center; font-size: 24px; transition: transform 0.2s, background 0.2s; }\n            #chat-widget-btn:hover { transform: scale(1.05); background: linear-gradient(135deg, #4338CA, #6D28D9); }\n            #chat-widget-window { display: none; position: absolute; bottom: 80px; right: 0; width: 350px; height: 500px; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2); flex-direction: column; overflow: hidden; border: 1px solid #e5e7eb; opacity: 0; pointer-events: none; transform: translateY(10px); transition: opacity 0.3s ease, transform 0.3s ease; }\n            #chat-widget-window.open { opacity: 1; pointer-events: all; transform: translateY(0); }\n            #chat-widget-header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; font-weight: 600; }\n            #chat-widget-header .title { display: flex; align-items: center; gap: 10px; }\n            #chat-widget-close { background: rgba(255, 255, 255, 0.2); border: none; color: white; cursor: pointer; font-size: 14px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }\n            #chat-widget-close:hover { background: rgba(255, 255, 255, 0.4); }\n            #chat-widget-messages { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #f9fafb; }\n            .chat-msg { max-width: 80%; padding: 10px 14px; border-radius: 8px; font-size: 14px; line-height: 1.4; }\n            .chat-msg.bot { background: white; border: 1px solid #e5e7eb; color: #1f2937; align-self: flex-start; border-bottom-left-radius: 0; }\n            .chat-msg.user { background: #4F46E5; color: white; align-self: flex-end; border-bottom-right-radius: 0; }\n            .chat-msg.bot p { margin: 0 0 8px 0; }\n            .chat-msg.bot p:last-child { margin: 0; }\n            .chat-msg.bot strong { color: #111827; }\n            #chat-widget-input-area { display: flex; padding: 12px; background: white; border-top: 1px solid #e5e7eb; gap: 8px; }\n            #chat-widget-input { flex: 1; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 20px; outline: none; font-size: 14px; transition: border-color 0.2s; }\n            #chat-widget-input:focus { border-color: #4F46E5; }\n            #chat-widget-send { background: #4F46E5; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }\n            #chat-widget-send:hover { background: #4338CA; }\n        ";
        document.head.appendChild(style);
    };
    ChatbotWidget.prototype.createWidget = function () {
        this.container = document.createElement('div');
        this.container.id = 'chat-widget-container';
        this.toggleBtn = document.createElement('button');
        this.toggleBtn.id = 'chat-widget-btn';
        this.toggleBtn.innerHTML = '💬';
        this.chatWindow = document.createElement('div');
        this.chatWindow.id = 'chat-widget-window';
        this.chatWindow.style.display = 'none';
        var header = document.createElement('div');
        header.id = 'chat-widget-header';
        header.innerHTML = "\n            <div class=\"title\"><span>\uD83E\uDD16</span> Business Growth Assistant</div>\n            <button id=\"chat-widget-close\">\u2500</button>\n        ";
        this.messagesContainer = document.createElement('div');
        this.messagesContainer.id = 'chat-widget-messages';
        var initialMsg = document.createElement('div');
        initialMsg.className = 'chat-msg bot';
        initialMsg.textContent = "Hello! I'm your local business AI assistant. How can I help you grow today?";
        this.messagesContainer.appendChild(initialMsg);
        var inputArea = document.createElement('div');
        inputArea.id = 'chat-widget-input-area';
        this.inputField = document.createElement('input');
        this.inputField.type = 'text';
        this.inputField.id = 'chat-widget-input';
        this.inputField.placeholder = 'Type a message...';
        var sendBtn = document.createElement('button');
        sendBtn.id = 'chat-widget-send';
        sendBtn.innerHTML = '➤';
        inputArea.appendChild(this.inputField);
        inputArea.appendChild(sendBtn);
        this.chatWindow.appendChild(header);
        this.chatWindow.appendChild(this.messagesContainer);
        this.chatWindow.appendChild(inputArea);
        this.container.appendChild(this.toggleBtn);
        this.container.appendChild(this.chatWindow);
        document.body.appendChild(this.container);
    };
    ChatbotWidget.prototype.attachEventListeners = function () {
        var _this = this;
        this.toggleBtn.addEventListener('click', function () { return _this.toggleChat(); });
        var closeBtn = document.getElementById('chat-widget-close');
        if (closeBtn)
            closeBtn.addEventListener('click', function () { return _this.toggleChat(); });
        this.inputField.addEventListener('keypress', function (e) { return _this.handleEnter(e); });
        var sendBtn = document.getElementById('chat-widget-send');
        if (sendBtn)
            sendBtn.addEventListener('click', function () { return _this.sendMessage(); });
    };
    ChatbotWidget.prototype.toggleChat = function () {
        var _this = this;
        if (this.chatWindow.style.display === 'none') {
            this.chatWindow.style.display = 'flex';
            setTimeout(function () { return _this.chatWindow.classList.add('open'); }, 10);
            this.inputField.focus();
        }
        else {
            this.chatWindow.classList.remove('open');
            setTimeout(function () { return _this.chatWindow.style.display = 'none'; }, 300);
        }
    };
    ChatbotWidget.prototype.handleEnter = function (e) {
        if (e.key === 'Enter') {
            this.sendMessage();
        }
    };
    ChatbotWidget.prototype.sendMessage = function () {
        return __awaiter(this, void 0, void 0, function () {
            var text, typingId, response, data, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        text = this.inputField.value.trim();
                        if (!text)
                            return [2 /*return*/];
                        this.appendMessage(text, 'user');
                        this.inputField.value = '';
                        typingId = "typing-" + Date.now();
                        this.appendMessage("...", 'bot', typingId);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, fetch(this.apiUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    message: text,
                                    history: this.chatHistory
                                })
                            })];
                    case 2:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("Error: ".concat(response.status));
                        }
                        return [4 /*yield*/, response.json()];
                    case 3:
                        data = _a.sent();
                        this.chatHistory.push({ role: "user", parts: text });
                        this.chatHistory.push({ role: "model", parts: data.response });
                        this.replaceMessage(typingId, data.response);
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        console.error("Chat API Error:", error_1);
                        this.replaceMessage(typingId, "Sorry, I couldn't connect to the server right now.");
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ChatbotWidget.prototype.appendMessage = function (text, sender, id) {
        if (id === void 0) { id = null; }
        var div = document.createElement('div');
        div.className = "chat-msg ".concat(sender);
        if (id)
            div.id = id;
        var formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\n/g, '<br>');
        div.innerHTML = formattedText;
        this.messagesContainer.appendChild(div);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    };
    ChatbotWidget.prototype.replaceMessage = function (id, newText) {
        var el = document.getElementById(id);
        if (el) {
            var formattedText = newText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedText = formattedText.replace(/\n/g, '<br>');
            el.innerHTML = formattedText;
            el.removeAttribute('id');
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    };
    return ChatbotWidget;
}());
// Initialize the widget when the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { return new ChatbotWidget(); });
}
else {
    new ChatbotWidget();
}
