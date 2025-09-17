export type SidebarItem = {
  title: string;
  url?: string;
  isActive?: boolean;
  icon?: React.ReactNode;
  items?: SidebarItem[];
}