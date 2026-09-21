import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/mekan-giris" });
      }}
    >
      <Button type="submit" variant="ghost" size="sm" className="w-full">
        Çıkış
      </Button>
    </form>
  );
}
