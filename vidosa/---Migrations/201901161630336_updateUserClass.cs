namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class updateUserClass : DbMigration
    {
        public override void Up()
        {
            DropForeignKey("dbo.Roles", "User_UserId", "dbo.Users");
            DropIndex("dbo.Roles", new[] { "User_UserId" });
            DropPrimaryKey("dbo.Roles");
            CreateTable(
                "dbo.RoleUsers",
                c => new
                    {
                        Role_RoleId = c.Int(nullable: false),
                        User_UserId = c.Int(nullable: false),
                    })
                .PrimaryKey(t => new { t.Role_RoleId, t.User_UserId })
                .ForeignKey("dbo.Roles", t => t.Role_RoleId, cascadeDelete: true)
                .ForeignKey("dbo.Users", t => t.User_UserId, cascadeDelete: true)
                .Index(t => t.Role_RoleId)
                .Index(t => t.User_UserId);
            
            AddColumn("dbo.Users", "ActivationCode", c => c.Guid(nullable: false));
            AddColumn("dbo.Roles", "RoleId", c => c.Int(nullable: false, identity: false));
            AddPrimaryKey("dbo.Roles", "RoleId");
            DropColumn("dbo.Roles", "Id");
            DropColumn("dbo.Roles", "User_UserId");
        }
        
        public override void Down()
        {
            AddColumn("dbo.Roles", "User_UserId", c => c.Int());
            AddColumn("dbo.Roles", "Id", c => c.Int(nullable: false, identity: true));
            DropForeignKey("dbo.RoleUsers", "User_UserId", "dbo.Users");
            DropForeignKey("dbo.RoleUsers", "Role_RoleId", "dbo.Roles");
            DropIndex("dbo.RoleUsers", new[] { "User_UserId" });
            DropIndex("dbo.RoleUsers", new[] { "Role_RoleId" });
            DropPrimaryKey("dbo.Roles");
            DropColumn("dbo.Roles", "RoleId");
            DropColumn("dbo.Users", "ActivationCode");
            DropTable("dbo.RoclsleUsers");
            AddPrimaryKey("dbo.Roles", "Id");
            CreateIndex("dbo.Roles", "User_UserId");
            AddForeignKey("dbo.Roles", "User_UserId", "dbo.Users", "UserId");
        }
    }
}
