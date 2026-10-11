'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { createPortal } from 'react-dom';
import {
	NavigationMenu,
	NavigationMenuList,
	NavigationMenuItem,
	NavigationMenuLink,
} from '@/components/ui/navigation-menu';
import { Sparkles, Github, LifeBuoy, LogIn, LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import UserMenu from '../../dashboard/components/UserMenu';

export function Header({ onSignIn }: { onSignIn?: () => void }) {
	const [open, setOpen] = React.useState(false);
	const scrolled = useScroll(10);
	const { isAuthenticated, user } = useAuthStore();

	React.useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [open]);

	return (
		<header
			className={cn('sticky top-0 z-50 w-full border-b border-transparent', {
				'bg-background/95 supports-[backdrop-filter]:bg-background/50 border-border backdrop-blur-lg':
					scrolled,
			})}
		>
			<nav className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6">
				<div className="flex items-center gap-5">
					<a href="/" aria-label="MindTabs home" className="flex flex-row items-center gap-2 hover:bg-accent rounded-md p-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center shadow-lg shadow-primary-500/25">
                          <Sparkles size={16} className="text-white" />
                        </div>
                        <span className="font-bold text-lg gradient-text">MindTabs</span>
					</a>
					<NavigationMenu className="hidden md:flex ml-4">
						<NavigationMenuList>
							<NavigationMenuItem>
                                <button onClick={() => window.open("https://github.com/Sagar02k4/MindTabs", "_blank", "noopener,noreferrer")} className="flex items-center gap-2 hover:bg-accent rounded-md text-sm font-medium">
                                    <Github size={16} /> GitHub
                                </button>
							</NavigationMenuItem>
                            <NavigationMenuItem>
                                <button onClick={() => window.open("https://github.com/Sagar02k4/MindTabs/issues", "_blank", "noopener,noreferrer")} className="flex items-center gap-2 hover:bg-accent rounded-md text-sm font-medium">
                                    <LifeBuoy size={16} /> Support
                                </button>
                            </NavigationMenuItem>
						</NavigationMenuList>
					</NavigationMenu>
				</div>
				<div className="hidden items-center gap-2 md:flex">
                    {isAuthenticated ? (
                        <UserMenu />
                    ) : (
                        <Button variant="outline" onClick={onSignIn}><LogIn className="w-4 h-4 mr-2" /> Sign In</Button>
                    )}
				</div>
				<Button
					size="icon"
					variant="outline"
					onClick={() => setOpen(!open)}
					className="md:hidden"
					aria-expanded={open}
					aria-controls="mobile-menu"
					aria-label="Toggle menu"
				>
					<MenuToggleIcon open={open} className="size-5" duration={300} />
				</Button>
			</nav>
			<MobileMenu open={open} className="flex flex-col justify-between gap-2 overflow-y-auto">
				<NavigationMenu className="max-w-full">
					<div className="flex w-full flex-col gap-y-2 pb-4">
                        <a href="https://github.com/Sagar02k4/MindTabs" target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded-md hover:bg-accent" onClick={() => setOpen(false)}>
                            <Github size={18} /> GitHub
                        </a>
                        <a href="https://github.com/Sagar02k4/MindTabs/issues" target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded-md hover:bg-accent" onClick={() => setOpen(false)}>
                            <LifeBuoy size={18} /> Support
                        </a>
					</div>
				</NavigationMenu>
				<div className="flex flex-col gap-2 border-t pt-4">
                    {isAuthenticated ? (
                        <div className="flex flex-col gap-2">
                            <span className="text-sm px-2 text-muted-foreground">{user?.email}</span>
                        </div>
                    ) : (
                        <Button variant="outline" className="w-full bg-transparent" onClick={onSignIn}>
                            Sign In
                        </Button>
                    )}
				</div>
			</MobileMenu>
		</header>
	);
}

type MobileMenuProps = React.ComponentProps<'div'> & {
	open: boolean;
};

function MobileMenu({ open, children, className, ...props }: MobileMenuProps) {
	if (!open || typeof window === 'undefined') return null;

	return createPortal(
		<div
			id="mobile-menu"
			className={cn(
				'bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg',
				'fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-y md:hidden',
			)}
		>
			<div
				data-slot={open ? 'open' : 'closed'}
				className={cn(
					'data-[slot=open]:animate-in data-[slot=open]:zoom-in-97 ease-out',
					'size-full p-4',
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</div>,
		document.body,
	);
}

function useScroll(threshold: number) {
	const [scrolled, setScrolled] = React.useState(false);

	const onScroll = React.useCallback(() => {
		setScrolled(window.scrollY > threshold);
	}, [threshold]);

	React.useEffect(() => {
		window.addEventListener('scroll', onScroll);
		return () => window.removeEventListener('scroll', onScroll);
	}, [onScroll]);

	React.useEffect(() => {
		onScroll();
	}, [onScroll]);

	return scrolled;
}
