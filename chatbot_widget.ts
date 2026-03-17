// chatbot_widget.ts

interface ChatMessage {
    role: 'user' | 'model';
    parts: string;
}

interface ChatHistoryItem {
    role: string;
    parts: string;
}

class ChatbotWidget {
    private container: HTMLDivElement;
    private chatWindow: HTMLDivElement;
    private messagesContainer: HTMLDivElement;
    private inputField: HTMLInputElement;
    private toggleBtn: HTMLButtonElement;
    
    private apiUrl: string = "http://localhost:8000/chat";
    private chatHistory: ChatHistoryItem[] = [];

    constructor() {
        this.injectStyles();
        this.createWidget();
        this.attachEventListeners();
    }

    private injectStyles(): void {
        const style = document.createElement('style');
        style.innerHTML = `
            #chat-widget-container { position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: 'Inter', 'Roboto', sans-serif; }
            #chat-widget-btn { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); display: flex; align-items: center; justify-content: center; font-size: 24px; transition: transform 0.2s, background 0.2s; }
            #chat-widget-btn:hover { transform: scale(1.05); background: linear-gradient(135deg, #4338CA, #6D28D9); }
            #chat-widget-window { display: none; position: absolute; bottom: 80px; right: 0; width: 350px; height: 500px; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2); flex-direction: column; overflow: hidden; border: 1px solid #e5e7eb; opacity: 0; pointer-events: none; transform: translateY(10px); transition: opacity 0.3s ease, transform 0.3s ease; }
            #chat-widget-window.open { opacity: 1; pointer-events: all; transform: translateY(0); }
            #chat-widget-header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; font-weight: 600; }
            #chat-widget-header .title { display: flex; align-items: center; gap: 10px; }
            #chat-widget-close { background: rgba(255, 255, 255, 0.2); border: none; color: white; cursor: pointer; font-size: 14px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
            #chat-widget-close:hover { background: rgba(255, 255, 255, 0.4); }
            #chat-widget-messages { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #f9fafb; }
            .chat-msg { max-width: 80%; padding: 10px 14px; border-radius: 8px; font-size: 14px; line-height: 1.4; }
            .chat-msg.bot { background: white; border: 1px solid #e5e7eb; color: #1f2937; align-self: flex-start; border-bottom-left-radius: 0; }
            .chat-msg.user { background: #4F46E5; color: white; align-self: flex-end; border-bottom-right-radius: 0; }
            .chat-msg.bot p { margin: 0 0 8px 0; }
            .chat-msg.bot p:last-child { margin: 0; }
            .chat-msg.bot strong { color: #111827; }
            #chat-widget-input-area { display: flex; padding: 12px; background: white; border-top: 1px solid #e5e7eb; gap: 8px; }
            #chat-widget-input { flex: 1; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 20px; outline: none; font-size: 14px; transition: border-color 0.2s; }
            #chat-widget-input:focus { border-color: #4F46E5; }
            #chat-widget-send { background: #4F46E5; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
            #chat-widget-send:hover { background: #4338CA; }
        `;
        document.head.appendChild(style);
    }

    private createWidget(): void {
        this.container = document.createElement('div');
        this.container.id = 'chat-widget-container';

        this.toggleBtn = document.createElement('button');
        this.toggleBtn.id = 'chat-widget-btn';
        this.toggleBtn.innerHTML = '💬';

        this.chatWindow = document.createElement('div');
        this.chatWindow.id = 'chat-widget-window';
        this.chatWindow.style.display = 'none';

        const header = document.createElement('div');
        header.id = 'chat-widget-header';
        header.innerHTML = `
            <div class="title"><span>🤖</span> Business Growth Assistant</div>
            <button id="chat-widget-close">─</button>
        `;

        this.messagesContainer = document.createElement('div');
        this.messagesContainer.id = 'chat-widget-messages';
        
        const initialMsg = document.createElement('div');
        initialMsg.className = 'chat-msg bot';
        initialMsg.textContent = "Hello! I'm your local business AI assistant. How can I help you grow today?";
        this.messagesContainer.appendChild(initialMsg);

        const inputArea = document.createElement('div');
        inputArea.id = 'chat-widget-input-area';
        this.inputField = document.createElement('input');
        this.inputField.type = 'text';
        this.inputField.id = 'chat-widget-input';
        this.inputField.placeholder = 'Type a message...';

        const sendBtn = document.createElement('button');
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
    }

    private attachEventListeners(): void {
        this.toggleBtn.addEventListener('click', () => this.toggleChat());
        
        const closeBtn = document.getElementById('chat-widget-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.toggleChat());

        this.inputField.addEventListener('keypress', (e: KeyboardEvent) => this.handleEnter(e));
        
        const sendBtn = document.getElementById('chat-widget-send');
        if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
    }

    private toggleChat(): void {
        if (this.chatWindow.style.display === 'none') {
            this.chatWindow.style.display = 'flex';
            setTimeout(() => this.chatWindow.classList.add('open'), 10);
            this.inputField.focus();
        } else {
            this.chatWindow.classList.remove('open');
            setTimeout(() => this.chatWindow.style.display = 'none', 300);
        }
    }

    private handleEnter(e: KeyboardEvent): void {
        if (e.key === 'Enter') {
            this.sendMessage();
        }
    }

    private async sendMessage(): Promise<void> {
        const text = this.inputField.value.trim();

        if (!text) return;

        this.appendMessage(text, 'user');
        this.inputField.value = '';

        const typingId = "typing-" + Date.now();
        this.appendMessage("...", 'bot', typingId);

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: this.chatHistory
                })
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();
            
            this.chatHistory.push({ role: "user", parts: text });
            this.chatHistory.push({ role: "model", parts: data.response });

            this.replaceMessage(typingId, data.response);

        } catch (error) {
            console.error("Chat API Error:", error);
            this.replaceMessage(typingId, "Sorry, I couldn't connect to the server right now.");
        }
    }

    private appendMessage(text: string, sender: 'user' | 'bot', id: string | null = null): void {
        const div = document.createElement('div');
        div.className = `chat-msg ${sender}`;
        if (id) div.id = id;
        
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\n/g, '<br>');
        
        div.innerHTML = formattedText;
        this.messagesContainer.appendChild(div);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    private replaceMessage(id: string, newText: string): void {
        const el = document.getElementById(id);
        if (el) {
            let formattedText = newText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedText = formattedText.replace(/\n/g, '<br>');
            el.innerHTML = formattedText;
            el.removeAttribute('id');
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }
}

// Initialize the widget when the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ChatbotWidget());
} else {
    new ChatbotWidget();
}
