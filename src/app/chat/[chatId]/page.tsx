import ChatClient from "./ChatClient";

export function generateStaticParams() {
  return [{ chatId: "direct" }];
}

export default function ChatPage() {
  return <ChatClient />;
}
