import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/trpc/init";

/**
 * Test router to demonstrate public and protected procedures.
 * TODO: Remove this file after testing.
 */
export const testRouter = createTRPCRouter({
  // Public procedure - accessible to anyone
  public: publicProcedure.query(() => {
    return {
      message: "This is a public endpoint, accessible to anyone",
      timestamp: new Date(),
    };
  }),

  // Protected procedure - requires authentication
  protected: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is a protected endpoint, only accessible when logged in",
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
      },
      timestamp: new Date(),
    };
  }),
});
