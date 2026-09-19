import ClientRedirect from "./ClientRedirect";

export function generateStaticParams() {
  return [{ chatId: "direct" }];
}

export default function ChatPage() {
  return <ClientRedirect />;
}
