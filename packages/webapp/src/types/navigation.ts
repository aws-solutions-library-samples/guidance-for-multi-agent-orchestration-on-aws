export interface NavigationEvent {
  detail: {
    href: string;
    external?: boolean;
  };
  preventDefault: () => void;
}