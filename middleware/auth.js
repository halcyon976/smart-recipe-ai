// Route guards keep private pages and account actions behind login.
exports.requireAuth = (req,res,next) => req.isAuthenticated() ? next() : res.redirect('/login');
exports.attachUser = (req,res,next) => { res.locals.currentUser = req.user || null; res.locals.currentPath=req.path; res.locals.flash = req.session.flash || null; delete req.session.flash; next(); };
