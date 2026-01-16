import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Settings, Trash2 } from "lucide-react";

export function UserSettings({ user, onUpdate }: { user: any, onUpdate: () => void }) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        weight: user.weight || 0,
        height: user.height || 0,
        tdee: user.tdee || 2000,
        goal: user.goal || 'maintain'
    });

    const handleSave = async () => {
        try {
            const res = await apiFetch("/api/user/update", {
                method: "POST",
                body: JSON.stringify(formData)
            });
            
            if (res.ok) {
                toast.success("Profile updated!");
                setOpen(false);
                onUpdate();
            } else {
                const data = await res.json();
                toast.error(data.error || "Update failed");
            }
        } catch (e) {
            toast.error("Network error");
        }
    };

    const handleDelete = async () => {
        if(!confirm("Are you sure? This will delete all your data permanently.")) return;
        
        try {
            const res = await apiFetch("/api/user/delete", { method: "POST" });
            if (res.ok) {
                window.location.href = "/";
            }
        } catch (e) {
            toast.error("Failed to delete account");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>User Settings</DialogTitle>
                    <DialogDescription>
                        Update your profile metrics here.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="weight" className="text-right">Weight (kg)</Label>
                        <Input 
                            id="weight"
                            type="number" 
                            value={formData.weight} 
                            onChange={e => setFormData({...formData, weight: parseFloat(e.target.value)})}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="height" className="text-right">Height (cm)</Label>
                        <Input 
                            id="height"
                            type="number" 
                            value={formData.height} 
                            onChange={e => setFormData({...formData, height: parseFloat(e.target.value)})}
                            className="col-span-3"
                        />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tdee" className="text-right">TDEE</Label>
                        <Input 
                            id="tdee"
                            type="number" 
                            value={formData.tdee} 
                            onChange={e => setFormData({...formData, tdee: parseFloat(e.target.value)})}
                            className="col-span-3"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                     <Button variant="destructive" onClick={handleDelete} className="mr-auto">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                    </Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
