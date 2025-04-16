/**
 * 404 Not Found handler
 */
exports.notFound = (req, res) => {
    res.status(404).json({ status: "FAILED", message: "Route not found" });
};
