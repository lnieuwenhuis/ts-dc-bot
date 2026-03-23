import { JSX } from 'solid-js';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: JSX.Element;
  color?: string;
}

export default function StatCard(props: StatCardProps) {
  const bgColor = props.color ?? 'bg-blurple/20';
  const iconColor = props.color ? props.color.replace('/20', '') : 'text-blurple';

  return (
    <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <p class="text-slate-400 text-sm font-medium mb-1">{props.title}</p>
          <p class="text-3xl font-bold text-white">{props.value}</p>
          {props.subtitle && (
            <p class="text-slate-400 text-sm mt-1">{props.subtitle}</p>
          )}
        </div>
        <div class={`${bgColor} p-3 rounded-lg`}>
          <div class={`w-6 h-6 ${iconColor}`}>
            {props.icon}
          </div>
        </div>
      </div>
    </div>
  );
}
