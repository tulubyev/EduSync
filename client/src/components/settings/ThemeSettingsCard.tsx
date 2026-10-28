import { Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLang } from '@/i18n';
import { ThemeButtons } from '../ThemeSwitcher';

/** «Оформление»: светлая, тёмная или как в системе (#45) */
export function ThemeSettingsCard() {
  const { m } = useLang();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          {m.theme.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ThemeButtons />
        <p className="text-sm text-muted-foreground">{m.theme.hint}</p>
      </CardContent>
    </Card>
  );
}
