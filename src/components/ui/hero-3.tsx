import React from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2 } from "lucide-react";

interface HeroDashboardProps {
    children: React.ReactNode;
    onRefresh: () => void;
    onClearAll: () => void;
    tabsCount: number;
}

export function HeroDashboardWrapper({ children, onRefresh, onClearAll, tabsCount }: HeroDashboardProps) {
	return (
		<section className="mx-auto w-full max-w-7xl overflow-hidden pt-8">
			{/* Shades */}
			<div
				aria-hidden="true"
				className="absolute inset-x-0 top-0 h-[500px] overflow-hidden pointer-events-none"
			>
				<div
					className={cn(
						"absolute inset-0 isolate -z-10",
						"bg-[radial-gradient(20%_80%_at_20%_0%,var(--primary)/0.1,transparent)]"
					)}
				/>
			</div>
			
			<div className="relative z-10 flex max-w-4xl flex-col gap-4 px-6 mb-8">
				<h1
					className={cn(
						"text-balance font-medium text-3xl text-foreground leading-tight md:text-5xl",
						"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards duration-500 ease-out"
					)}
				>
					Your MindTabs Dashboard
				</h1>

				<p
					className={cn(
						"text-muted-foreground text-sm tracking-wider sm:text-lg md:text-xl",
						"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-100 duration-500 ease-out"
					)}
				>
					Manage tab overload, track your intent, and focus on what matters.
				</p>

				<div className="fade-in slide-in-from-bottom-10 flex w-fit animate-in items-center justify-start gap-3 fill-mode-backwards pt-2 delay-200 duration-500 ease-out">
					<Button type="button" variant="outline" aria-label="Refresh saved tabs" onClick={onRefresh}>
						<RefreshCw className="size-4 mr-2" />{" "}
						Refresh
					</Button>
                    {tabsCount > 0 && (
                        <Button type="button" variant="destructive" aria-label="Delete all saved tabs and reminders" onClick={onClearAll}>
                            <Trash2 className="size-4 mr-2" />{" "}
                            Clear All
                        </Button>
                    )}
				</div>
			</div>
			
			<div className="relative">
				<div
					className={cn(
						"absolute -inset-x-20 inset-y-0 -translate-y-1/3 scale-120 rounded-full pointer-events-none",
						"bg-[radial-gradient(ellipse_at_center,var(--primary)/0.08),transparent,transparent)]",
						"blur-[50px]"
					)}
				/>
				<div
					className={cn(
						"mask-b-from-60% relative mt-4 overflow-visible px-6",
						"fade-in slide-in-from-bottom-5 animate-in fill-mode-backwards delay-300 duration-1000 ease-out"
					)}
				>
					<div className="relative rounded-xl border bg-card p-6 shadow-xl ring-1 ring-card min-h-[500px]">
                        {/* INJECT ACTUAL DASHBOARD CONTENT HERE */}
                        {children}
					</div>
				</div>
			</div>
		</section>
	);
}
