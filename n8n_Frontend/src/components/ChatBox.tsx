"use client";

import { useState, useRef, useEffect } from "react";
import { sendMessage } from "../redux/api";
import { 
  Send, 
  Smile, 
  Image as ImageIcon, 
  Paperclip, 
  Phone, 
  Video, 
  Info, 
  ThumbsUp, 
  Mic, 
  MoreHorizontal,
  ChevronLeft
} from "lucide-react";

export default function ChatBox() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ role: string; text: string; time: string }[]>([
    { role: "bot", text: "Hello! How can I help you today? 👋", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat when a new message arrives
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat, loading]);

  const handleSend = async (textToSend?: string) => {
    const activeMsg = textToSend || message;
    if (!activeMsg.trim()) return;

    const userMsg = activeMsg;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChat((prev) => [...prev, { role: "user", text: userMsg, time: timeString }]);
    setMessage("");
    setLoading(true);

    try {
      const res = await sendMessage(userMsg);
      setChat((prev) => [
        ...prev,
        { 
          role: "bot", 
          text: res.reply, 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        },
      ]);
    } catch (err) {
      setChat((prev) => [
        ...prev,
        { 
          role: "bot", 
          text: "Error connecting to server. Please try again. ❌", 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        },
      ]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-white border-x border-gray-100 shadow-2xl font-sans">
      
      {/* Messenger Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-150 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button className="md:hidden text-gray-500 hover:text-gray-800">
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          {/* Avatar with dynamic active dot */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
              B
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          
          <div>
            <h3 className="font-bold text-gray-800 text-sm leading-tight">kayes Assistant</h3>
            <p className="text-xs text-green-500 font-medium">Active now</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 text-blue-600">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Phone className="h-5 w-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Video className="h-5 w-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Info className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {chat.map((c, i) => {
          const isUser = c.role === "user";
          return (
            <div key={i} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
              <div className="flex items-end gap-2 max-w-[80%]">
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold">
                    B
                  </div>
                )}
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                  }`}
                >
                  {c.text}
                </div>
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-9 font-medium">
                {c.time}
              </span>
            </div>
          );
        })}

        {/* Messenger-style Animated Typing Bubble */}
        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">
              B
            </div>
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex gap-1 items-center">
              <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Action Bar */}
      <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
        {/* Left Side Icons */}
        <div className="flex items-center gap-1 text-gray-400">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreHorizontal className="h-5 w-5 text-blue-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
            <ImageIcon className="h-5 w-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
            <Paperclip className="h-5 w-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
            <Mic className="h-5 w-5" />
          </button>
        </div>

        {/* Input Field Box */}
        <div className="flex-1 flex items-center bg-gray-100 rounded-full px-4 py-2 border border-transparent focus-within:border-gray-250 transition-all">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm focus:outline-none text-gray-800 placeholder-gray-400"
            placeholder="Aa"
          />
          <button className="text-gray-400 hover:text-blue-600 transition-colors">
            <Smile className="h-5 w-5" />
          </button>
        </div>

        {/* Dynamic Send / Thumbs Up Button */}
        {message.trim() ? (
          <button
            onClick={() => handleSend()}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all shadow-md active:scale-95"
          >
            <Send className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => handleSend("👍")}
            className="p-2 text-blue-600 hover:bg-gray-100 rounded-full transition-all active:scale-90"
          >
            <ThumbsUp className="h-5 w-5 fill-current" />
          </button>
        )}
      </div>
    </div>
  );
}













//  "use client";

// import { useState } from "react";
// import { sendMessage } from "../redux/api";

// export default function ChatBox() {
//   const [message, setMessage] = useState("");
//   const [chat, setChat] = useState<
//     { role: string; text: string }[]
//   >([]);
//   const [loading, setLoading] = useState(false);

//   const handleSend = async () => {
//     if (!message.trim()) return;

//     const userMsg = message;

//     setChat((prev) => [...prev, { role: "user", text: userMsg }]);
//     setMessage("");
//     setLoading(true);

//     try {
//       const res = await sendMessage(userMsg);

//       setChat((prev) => [
//         ...prev,
//         { role: "bot", text: res.reply },
//       ]);
//     } catch (err) {
//       setChat((prev) => [
//         ...prev,
//         { role: "bot", text: "Error connecting to server ❌" },
//       ]);
//     }

//     setLoading(false);
//   };

//   return (
//     <div className="flex flex-col h-screen p-4 bg-gray-100">
//       {/* Chat messages */}
//       <div className="flex-1 overflow-y-auto space-y-2">
//         {chat.map((c, i) => (
//           <div
//             key={i}
//             className={`p-2 rounded-lg max-w-xs ${
//               c.role === "user"
//                 ? "bg-blue-500 text-white ml-auto"
//                 : "bg-gray-300"
//             }`}
//           >
//             {c.text}
//           </div>
//         ))}

//         {loading && (
//           <div className="text-gray-500">Thinking...</div>
//         )}
//       </div>

//       {/* Input */}
//       <div className="flex gap-2 mt-4">
//         <input
//           value={message}
//           onChange={(e) => setMessage(e.target.value)}
//           className="flex-1 border p-2 rounded"
//           placeholder="Type message..."
//         />

//         <button
//           onClick={handleSend}
//           className="bg-blue-600 text-white px-4 rounded"
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// }