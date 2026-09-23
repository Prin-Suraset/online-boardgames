import { usePathname } from "./lib/navigation";
import { HubPage } from "./pages";
import { RoomPage } from "./pages/room";

export function App() {
  const pathname = usePathname();
  const roomMatch = /^\/room\/([A-Za-z0-9]{6})\/?$/.exec(pathname);

  const page = roomMatch?.[1] !== undefined
    ? <RoomPage code={roomMatch[1]} />
    : <HubPage />;

  return (
    <div className={roomMatch !== null ? "flex h-screen max-h-screen flex-col overflow-hidden bg-slate-950 supports-[height:100dvh]:h-[100dvh]" : undefined}>
      <Navbar />
      {roomMatch !== null ? <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{page}</div> : page}
      <AuthModal />
    </div>
  );
}
import { AuthModal } from "./components/AuthModal";
import { Navbar } from "./components/Navbar";
