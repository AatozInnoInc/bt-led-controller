using Microsoft.AspNetCore.Components.Authorization;
using System.Security.Claims;

namespace car_lister.Services;

public class FirebaseAuthenticationStateProvider : AuthenticationStateProvider
{
    private readonly FirebaseService _firebaseService;

    public FirebaseAuthenticationStateProvider(FirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public override async Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        var isAuthenticated = await _firebaseService.IsUserAuthenticated();

        if (!isAuthenticated)
        {
            return new AuthenticationState(new ClaimsPrincipal(new ClaimsIdentity()));
        }

        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Name, "Firebase User"),
            new Claim(ClaimTypes.Role, "User")
        }, "Firebase authentication");

        var user = new ClaimsPrincipal(identity);
        return new AuthenticationState(user);
    }

    public void NotifyAuthenticationStateChanged()
    {
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }
} 