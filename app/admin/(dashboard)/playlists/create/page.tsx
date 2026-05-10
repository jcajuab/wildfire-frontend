import type { ReactElement } from "react";

import { CreatePlaylistPageView } from "./create-playlist-page-client";

export default async function CreatePlaylistPage(): Promise<ReactElement> {
  return <CreatePlaylistPageView />;
}
