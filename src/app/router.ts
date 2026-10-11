export type Route = { name: 'lobby' } | { name: 'game'; id: string };

export function parseHash(hash: string): Route {
  const match = /^#\/game\/([a-z0-9-]+)\/?$/.exec(hash);
  return match ? { name: 'game', id: match[1] } : { name: 'lobby' };
}

export function gameHref(id: string): string {
  return `#/game/${id}`;
}

export function goToLobby(): void {
  if (location.hash !== '#/') location.hash = '#/';
}

export function startRouter(onRoute: (route: Route) => void): void {
  const handle = () => {
    const route = parseHash(location.hash);
    if (route.name === 'lobby' && location.hash !== '#/' && location.hash !== '') {
      history.replaceState(null, '', '#/');
    }
    onRoute(route);
  };
  window.addEventListener('hashchange', handle);
  handle();
}
