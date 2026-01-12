import { motion } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

export function NotFound() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">🥑</span>
                </div>
                <h1 className="text-6xl font-extrabold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    404
                </h1>
                <h2 className="text-2xl font-semibold mb-2">Page not found</h2>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                    Oops! The page you are looking for has vanished like a cheat
                    meal on Monday.
                </p>

                <div className="flex gap-4 justify-center">
                    <Link to="/">
                        <Button variant="outline" className="gap-2">
                            <ArrowLeft size={16} />
                            Go Back
                        </Button>
                    </Link>
                    <Link to="/home">
                        <Button className="gap-2">
                            <Home size={16} />
                            Home
                        </Button>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
