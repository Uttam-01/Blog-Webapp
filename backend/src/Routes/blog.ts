import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { sign , verify } from 'hono/jwt'
import { createPostInput, updatePostInput } from "@uttam_01/medium-common"
 
export const blogRouter = new Hono<{
	Bindings: {
		DATABASE_URL: string,
    JWT_SECRET: string
	},
  Variables : {
		userId: string 
	}
}>();

blogRouter.use('/*', async (c, next) => {
	try {
		const jwt = c.req.header('Authorization')|| "";
		if (!jwt) {
			c.status(401);
			return c.json({ error: "unauthorized" });
		}
		const token = jwt.split(' ')[1];
		const payload = await verify(token, c.env.JWT_SECRET);
		if (!payload) {
			c.status(401);
			return c.json({ error: "unauthorized" });
		}
		c.set('userId', payload.id);
		await next()
	} catch (error) {
		c.status(401);
		return c.json({ error: "unauthorized" });
	}
	
})


blogRouter.post('/', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json();
    const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());
	const { success } = createPostInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}
    try {
        const post = await prisma.post.create({
            data: {
				title: body.title,
                content: body.content,
                authorId : userId,
			}
        })
		return c.json({
			id: post.id
		});
    } catch (error) {
        return c.status(400); 
    }
})

blogRouter.put('/', async (c) => {
	const userId = c.get('userId');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());

	const body = await c.req.json();
	const { success } = updatePostInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}
	try {
		prisma.post.update({
			where: {
				id: body.id,
				authorId: userId
			},
			data: {
				title: body.title,
				content: body.content
			}
		});
		return c.text('updated post');
	} catch (error) {
		return c.status(400); 
	}
});

// add pagination
blogRouter.get('/bulk', async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());
	
	try {
		const posts = await prisma.post.findMany({});
		return c.json(posts);
	} catch (error) {
		return c.status(400);
	}
})

blogRouter.get('/:id', async (c) => {
	const userId = c.get('userId');
	const id = c.req.param('id');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());
	
	try {
		const post = await prisma.post.findUnique({
			where: {
				id
			}
		});
	
		return c.json(post);
	} catch (error) {
		return c.status(400);
	}

	
})


