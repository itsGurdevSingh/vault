export function createJwksRoute({ jwksService }) {
  return async function jwksHandler(req, res) {
    try {
      // Domain resolution strategy.
      const domain = req.params.domain;

      if (!domain) {
        return res.status(400).json({
          error: "Domain is required"
        });
      }

      const jwks = await jwksService.getJwks(domain);

      // Required JWKS headers
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=300");

      res.status(200).json(jwks);
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  };
}
