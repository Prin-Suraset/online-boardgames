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
    <>
      <Navbar />
      {page}
      <AuthModal />
    </>
  );
}
import { AuthModal } from "./components/AuthModal";
import { Navbar } from "./components/Navbar";
