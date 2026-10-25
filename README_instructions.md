# Faculty of Information and Communication Technology <br/> ITCS258 Backend Application Development <br/> API Testing

## Objectives

The objective of this lab is to:
- Explain and apply the testing pyramid principles (unit, integration, and E2E tests) in the context of REST API development.
- Design and implement unit tests for the Room service layer, focusing on business logic isolation using mocked dependencies.
- Create integration tests for the Room controller to verify correct interaction between the controller and service layers.
- Develop end-to-end tests for the complete Room API lifecycle (Create, Read, Update, Delete) using authentication and authorization.

## Exercise Tasks

### Task 1: Set Up Testing Environment

- Review the Hotel Booking Specification.
- Ensure your development environment has Jest and Supertest installed.
- Verify that the Room module (controller, service, DTOs) is properly set up in your NestJS application.
- Configure the testing module structure following NestJS conventions (co-locate spec files with source files).

### Task 2: Write Unit Tests for Room Service

- Create a `rooms.service.spec.ts` file in the rooms module directory.
- Mock the PrismaService or Room repository to isolate the service logic from database interactions.
- Write unit tests for the following service methods:
    - `create`: Verify the method correctly processes room data and calls the repository create method.
    - `findAll`: Verify the method returns all rooms from the repository.
    - `findOne`: Verify the method returns a specific room by ID and handles the case when the room is not found.
    - `update`: Verify the method calls the repository update method with correct parameters.
    - `remove`: Verify the method calls the repository delete method and handles deletion errors appropriately.
- Ensure each test includes both success scenarios and failure conditions (e.g., room not found, validation errors).
- Run the unit tests using the appropriate npm test command and verify all tests pass.

### Task 3: Write Integration Tests for Room Controller

- Create a `rooms.controller.integration.spec.ts` file to test controller-service interaction.
- Mock the RoomsService to isolate the controller from the service implementation and database.
- Override authentication guards (JwtAuthGuard, RolesGuard) and interceptors (CacheInterceptor) to bypass security and caching logic during tests.
- Write integration tests for the following controller endpoints:
    - `POST /rooms`: Verify the controller calls the service create method and returns the created room.
    - `GET /rooms`: Verify the controller calls the service findAll method and returns the list of rooms.
    - `GET /rooms/:id`: Verify the controller calls the service findOne method and handles both found and not found scenarios.
    - `PUT /rooms/:id`: Verify the controller calls the service update method with correct parameters.
    - `DELETE /rooms/:id`: Verify the controller calls the service remove method and handles not found errors by throwing NotFoundException.
- Run the integration tests and ensure all controller methods properly delegate to the service layer.

### Task 4: Write End-to-End Tests for Room API

- Create a `rooms.e2e-spec.ts` file in the test directory for full lifecycle testing.
- Configure the test module to initialize the complete NestJS application using AppModule.
- Mock the Redis cache store to avoid external dependencies during E2E testing.
- Seed a test admin user in the database with appropriate role permissions to access Room endpoints.
- Obtain a JWT access token by authenticating the test admin user through the login endpoint.
- Write E2E tests for the complete Room API lifecycle:
    - **Create Room**: Send POST request to create a new room with valid data and verify 201 Created response.
    - **Test Unauthorized Access**: Send POST request without authentication token and verify 401 Unauthorized response.
    - **Get All Rooms**: Send GET request to retrieve all rooms and verify the created room exists in the response.
    - **Get Single Room**: Send GET request to retrieve the specific room by ID and verify the response data.
    - **Update Room**: Send PUT request to update room details and verify 200 OK response with updated data.
    - **Test Update Not Found**: Send PUT request with invalid room ID and verify 404 Not Found response.
    - **Delete Room**: Send DELETE request to remove the room and verify 200 OK response.
    - **Verify Deletion**: Send GET request for the deleted room and verify 404 Not Found response.
- Implement proper cleanup in afterAll hook to remove test data and close the application.
- Run the E2E tests and verify the complete Room API workflow functions correctly.

## Submission

1. **Include a Generative AI usage declaration and reflection** at the beginning of your code file. Clearly state if AI tools were used and briefly reflect on your work.
2. **Push your code** to the provided GitHub Classroom repository for this assignment. Make sure all your code is committed and pushed before the submission deadline.
3. Submit the lab by the end of the next class session to the LAs. Late submissions may not be accepted.

## AI Usage Declaration and Reflection

Students must add an AI Declaration and Reflection of Today's Learning to the top of their code file.

A reflection is not a summary of what you did or what the AI generated.
Instead, it is a personal explanation of your learning process.

- If you used AI, focus on how AI impacted your learning or understanding of the code.
- If you did not use AI, focus on your learning, tools, and experience from the lab.

Here are examples:

### Example 1 – No AI Used

```tsx
/*
AI Declaration:
No Generative AI tools were used for this lab.
All code was written manually by the student.

Reflection:
[ Your Reflection goes here
Today’s lab helped me learn [key takeaway].
I practiced ...
]
*/

```

### Example 2 – AI Used for Reference

```tsx
/*
AI Declaration:
I used ChatGPT only to clarify HTML semantic tags.
No code was directly copied without modification.

Reflection:
[ Write 1–2 sentences reflecting on your learning or how AI impacted your understanding]
*/

```

### Example 3 – AI Assisted in Debugging

```tsx
/*
AI Declaration:
I used ChatGPT to help debug the table structure in my invoice layout.
I wrote all the other code, and I understand the entire implementation.

Reflection:
[ Write 1–2 sentences reflecting on your learning or how AI impacted your understanding ]
*/

```
