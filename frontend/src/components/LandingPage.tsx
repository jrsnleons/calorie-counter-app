import { motion } from "framer-motion";
import { Camera, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

export function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 text-foreground overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 w-full p-4 z-50 flex justify-between items-center bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
                    <img
                        src="/logo.svg"
                        alt="Pakals Logo"
                        className="w-8 h-8 shadow-lg rounded-lg transform hover:scale-110 transition-transform"
                    />
                    <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Pakals
                    </span>
                </div>
                <Link to="/login">
                    <Button variant="ghost" className="font-semibold">
                        Log In
                    </Button>
                </Link>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
                {/* Ambient Background */}
                <div className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10 max-w-4xl"
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium mb-8 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-foreground">Powered by Google Gemini AI</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-6 leading-tight">
                        Track Calories
                        <br />
                        <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                            The Smart Way
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                        Snap a photo. Get instant nutrition info. Stay on track with your health goals.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link to="/login">
                            <Button
                                size="lg"
                                className="rounded-full px-10 text-lg h-14 shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-105 group"
                            >
                                Start Free
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <Button
                            size="lg"
                            variant="outline"
                            className="rounded-full px-10 text-lg h-14"
                            onClick={() =>
                                document
                                    .getElementById("features")
                                    ?.scrollIntoView({ behavior: "smooth" })
                            }
                        >
                            See How It Works
                        </Button>
                    </div>
                </motion.div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-32 px-6">
                <div className="container mx-auto max-w-7xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            Everything you need
                        </h2>
                        <p className="text-xl text-muted-foreground">
                            Powered by AI. Built for simplicity.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="group p-8 rounded-3xl bg-card border hover:border-primary/50 shadow-sm hover:shadow-xl transition-all duration-300"
                        >
                            <div className="w-14 h-14 bg-gradient-to-br from-primary to-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                                <Camera size={28} className="text-white" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">
                                Instant Recognition
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Just take a photo of your meal. Our AI instantly identifies foods and calculates calories, protein, carbs, and fats.
                            </p>
                        </motion.div>

                        {/* Feature 2 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="group p-8 rounded-3xl bg-card border hover:border-primary/50 shadow-sm hover:shadow-xl transition-all duration-300"
                        >
                            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                                <TrendingUp size={28} className="text-white" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">
                                Track Progress
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Beautiful charts show your daily intake vs. goals. See your calorie deficit and macro breakdown at a glance.
                            </p>
                        </motion.div>

                        {/* Feature 3 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="group p-8 rounded-3xl bg-card border hover:border-primary/50 shadow-sm hover:shadow-xl transition-all duration-300"
                        >
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg overflow-hidden">
                                <img
                                    src="/logo.svg"
                                    alt="Logo"
                                    className="w-10 h-10"
                                />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">
                                Stay Consistent
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Log your weight daily. Review your meal history. Build healthy habits that stick with simple, intuitive tracking.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 px-6 bg-gradient-to-b from-secondary/20 to-background">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="container mx-auto max-w-4xl text-center"
                >
                    <h2 className="text-5xl md:text-6xl font-bold mb-6">
                        Ready to get started?
                    </h2>
                    <p className="text-xl text-muted-foreground mb-10">
                        Join thousands tracking their nutrition the smart way.
                    </p>
                    <Link to="/login">
                        <Button
                            size="lg"
                            className="rounded-full px-12 text-lg h-16 shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-105"
                        >
                            Start Tracking Free
                        </Button>
                    </Link>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-border">
                <div className="container mx-auto text-center text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} Pakals. Built for your health.</p>
                </div>
            </footer>
        </div>
    );
}
